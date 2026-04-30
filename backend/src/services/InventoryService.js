import { InventoryRepository } from '../repositories/InventoryRepository.js';
import { WarehouseRepository } from '../repositories/WarehouseRepository.js';
import { WarehouseTransferRepository } from '../repositories/WarehouseTransferRepository.js';
import { WarehouseService } from './WarehouseService.js';
import { AlertService } from './AlertService.js';
import AuditLog from '../models/AuditLog.js';
import { sanitizeForML, hasFiniteNumericValues } from '../middleware/mlValidation.js';
import { generateFeatureVersion, getCurrentFeatureVersion, createPredictionMetadata } from '../utils/featureVersioning.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export class InventoryService {
  // Create a new inventory item
  static async createItem(itemData, userId) {
    // Check if SKU already exists in organization
    const existingItem = await InventoryRepository.findBySku(itemData.sku, itemData.orgId);
    if (existingItem) {
      throw new ConflictError('SKU already exists in this organization');
    }

    // Create the item
    const item = await InventoryRepository.create(itemData);

    // Request ML risk prediction
    try {
      const riskData = await this.predictRisk(item);
      if (riskData) {
        const updateData = {
          ...riskData,
          modelVersion: riskData.featureVersion || '1.0',
        };
        await InventoryRepository.updateRiskScore(item._id, item.orgId, updateData);
        item.riskScore = riskData.riskScore;
        item.riskTier = riskData.riskTier;
        item.riskExplanation = riskData.riskExplanation;

        // Check if alert needs to be created
        if (riskData.riskTier === 'high' || riskData.riskTier === 'critical') {
          await this.createRiskAlert(item, riskData);
        }
      }
    } catch (mlError) {
      console.error('ML Service error:', mlError.message);
      // Continue without ML prediction
    }

    // Check if reorder alert needed
    if (item.currentStock <= item.reorderPoint) {
      await this.createReorderAlert(item);
    }

    // Log audit
    await AuditLog.create({
      orgId: itemData.orgId,
      userId,
      action: 'INVENTORY_ITEM_CREATED',
      entityType: 'INVENTORY',
      entityId: item._id,
      newValue: itemData,
    });

    // Update warehouse utilization
    if (item.warehouseId) {
      await WarehouseService.recalculateUtilization(item.warehouseId, itemData.orgId);
    }

    return item;
  }

  // Get inventory item by ID
  static async getItem(itemId, orgId) {
    const item = await InventoryRepository.findById(itemId, orgId);
    if (!item) {
      throw new NotFoundError('Inventory item not found');
    }
    return item;
  }

  // List inventory items with filters
  static async listItems(orgId, options = {}) {
    const items = await InventoryRepository.findByOrgId(orgId, {
      ...options,
      populate: true,
    });
    const total = await InventoryRepository.countByOrgId(orgId, options);

    return {
      items,
      total,
      limit: options.limit || 20,
      skip: options.skip || 0,
    };
  }

  // Update inventory item
  static async updateItem(itemId, orgId, updateData, userId) {
    const existingItem = await InventoryRepository.findById(itemId, orgId);
    if (!existingItem) {
      throw new NotFoundError('Inventory item not found');
    }

    // If SKU is being changed, check uniqueness
    if (updateData.sku && updateData.sku !== existingItem.sku) {
      const skuExists = await InventoryRepository.findBySku(updateData.sku, orgId);
      if (skuExists) {
        throw new ConflictError('SKU already exists in this organization');
      }
    }

    const oldValue = existingItem.toObject();
    const item = await InventoryRepository.update(itemId, orgId, updateData);

    // Re-calculate risk score after update
    try {
      const riskData = await this.predictRisk(item);
      if (riskData) {
        const updateRiskData = {
          ...riskData,
          modelVersion: riskData.featureVersion || '1.0',
        };
        await InventoryRepository.updateRiskScore(item._id, item.orgId, updateRiskData);
        item.riskScore = riskData.riskScore;
        item.riskTier = riskData.riskTier;
        item.riskExplanation = riskData.riskExplanation;

        // Check if alert needs to be created
        if (riskData.riskTier === 'high' || riskData.riskTier === 'critical') {
          await this.createRiskAlert(item, riskData);
        }
      }
    } catch (mlError) {
      console.error('ML Service error:', mlError.message);
    }

    // Check reorder alert
    if (item.currentStock <= item.reorderPoint) {
      await this.createReorderAlert(item);
    }

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'INVENTORY_ITEM_UPDATED',
      entityType: 'INVENTORY',
      entityId: itemId,
      oldValue: { stock: oldValue.currentStock, ...updateData },
      newValue: updateData,
    });

    // Update warehouse utilization if stock or warehouse changed
    if (updateData.currentStock !== undefined || updateData.warehouseId) {
      // If warehouse changed, recalculate both old and new warehouses
      if (updateData.warehouseId && updateData.warehouseId !== oldValue.warehouseId?.toString()) {
        await WarehouseService.recalculateUtilization(oldValue.warehouseId, orgId);
        await WarehouseService.recalculateUtilization(updateData.warehouseId, orgId);
      } else {
        await WarehouseService.recalculateUtilization(item.warehouseId, orgId);
      }
    }

    return item;
  }

  // Update stock level
  static async updateStock(itemId, orgId, newStock, userId) {
    const existingItem = await InventoryRepository.findById(itemId, orgId);
    if (!existingItem) {
      throw new NotFoundError('Inventory item not found');
    }

    const oldStock = existingItem.currentStock;
    const item = await InventoryRepository.updateStock(itemId, orgId, newStock);

    // Re-calculate risk after stock update
    try {
      const riskData = await this.predictRisk(item);
      if (riskData) {
        await InventoryRepository.updateRiskScore(item._id, item.orgId, riskData);
        item.riskScore = riskData.riskScore;
        item.riskTier = riskData.riskTier;
      }
    } catch (mlError) {
      console.error('ML Service error:', mlError.message);
    }

    // Check reorder alert
    if (item.currentStock <= item.reorderPoint && oldStock > item.reorderPoint) {
      await this.createReorderAlert(item);
    }

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'INVENTORY_STOCK_UPDATED',
      entityType: 'INVENTORY',
      entityId: itemId,
      oldValue: { currentStock: oldStock },
      newValue: { currentStock: newStock },
    });

    // Update warehouse utilization
    if (item.warehouseId) {
      await WarehouseService.recalculateUtilization(item.warehouseId, orgId);
    }

    return item;
  }

  // Update pending order
  static async updatePendingOrder(itemId, orgId, pendingQty, incomingDays, userId) {
    const existingItem = await InventoryRepository.findById(itemId, orgId);
    if (!existingItem) {
      throw new NotFoundError('Inventory item not found');
    }

    const item = await InventoryRepository.updatePendingOrder(itemId, orgId, pendingQty, incomingDays);

    // Re-calculate risk (pending orders affect risk)
    try {
      const riskData = await this.predictRisk(item);
      if (riskData) {
        await InventoryRepository.updateRiskScore(item._id, item.orgId, riskData);
      }
    } catch (mlError) {
      console.error('ML Service error:', mlError.message);
    }

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'INVENTORY_PENDING_ORDER_UPDATED',
      entityType: 'INVENTORY',
      entityId: itemId,
      newValue: { pendingOrderQty: pendingQty, incomingStockDays: incomingDays },
    });

    return item;
  }

  // Get demand forecast for an item
  static async getForecast(itemId, orgId) {
    const item = await InventoryRepository.findById(itemId, orgId);
    if (!item) {
      throw new NotFoundError('Inventory item not found');
    }

    const daysUntilStockout = item.getDaysUntilStockout();

    return {
      itemId: item._id,
      sku: item.sku,
      productName: item.productName,
      currentStock: item.currentStock,
      averageDailyDemand: item.averageDailyDemand,
      leadTimeDays: item.leadTimeDays,
      safetyStock: item.safetyStock,
      reorderPoint: item.reorderPoint,
      daysUntilStockout: daysUntilStockout === Infinity ? null : daysUntilStockout,
      needsReorder: item.needsReorder(),
      forecast: {
        demand30Days: item.forecastDemand30,
        demand60Days: item.forecastDemand60,
        demand90Days: item.forecastDemand90,
      },
      riskAssessment: {
        riskScore: item.riskScore,
        riskTier: item.riskTier,
        riskExplanation: item.riskExplanation,
        supplierRiskScore: item.supplierRiskScore,
        isCriticalItem: item.isCriticalItem,
      },
    };
  }

  // Get items needing reorder
  static async getReorderList(orgId) {
    const items = await InventoryRepository.findItemsNeedingReorder(orgId);
    return items.map((item) => ({
      _id: item._id,
      sku: item.sku,
      productName: item.productName,
      warehouseId: item.warehouseId,
      currentStock: item.currentStock,
      reorderPoint: item.reorderPoint,
      safetyStock: item.safetyStock,
      suggestedOrderQty: Math.max(0, item.reorderPoint - item.currentStock + item.safetyStock),
      pendingOrderQty: item.pendingOrderQty,
      isCriticalItem: item.isCriticalItem,
      riskScore: item.riskScore,
      riskTier: item.riskTier,
      daysUntilStockout: item.getDaysUntilStockout(),
    }));
  }

  // Get inventory summary/dashboard stats
  static async getDashboardStats(orgId) {
    const stats = await InventoryRepository.getSummaryStats(orgId);
    const belowReorderCount = await InventoryRepository.countBelowReorderPoint(orgId);
    const warehouseSummary = await InventoryRepository.getWarehouseSummary(orgId);
    
    // Get warehouse stats
    let warehouseStats = null;
    let transferStats = null;
    let itemsByWarehouse = [];
    
    try {
      warehouseStats = await WarehouseRepository.getWarehouseStats(orgId);
      transferStats = await WarehouseTransferRepository.getTransferStats(orgId);
      itemsByWarehouse = await InventoryRepository.getItemsByWarehouse(orgId);
    } catch (err) {
      console.error('Error fetching warehouse stats:', err.message);
    }

    return {
      summary: {
        ...stats,
        belowReorderPoint: belowReorderCount,
        stockoutRiskIndex: stats.totalItems > 0
          ? Math.round((belowReorderCount / stats.totalItems) * 100)
          : 0,
      },
      riskDistribution: {
        low: stats.lowRisk,
        medium: stats.mediumRisk,
        high: stats.highRisk,
        critical: stats.criticalRisk,
      },
      warehouses: warehouseSummary,
      warehouseStats,
      transferStats,
      itemsByWarehouse,
    };
  }

  // Get warehouses list
  static async getWarehouses(orgId) {
    return InventoryRepository.getWarehouses(orgId);
  }

  // Delete inventory item
  static async deleteItem(itemId, orgId, userId) {
    const item = await InventoryRepository.findById(itemId, orgId);
    if (!item) {
      throw new NotFoundError('Inventory item not found');
    }

    const warehouseId = item.warehouseId;
    await InventoryRepository.delete(itemId, orgId);

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'INVENTORY_ITEM_DELETED',
      entityType: 'INVENTORY',
      entityId: itemId,
      oldValue: item.toObject(),
    });

    // Update warehouse utilization
    if (warehouseId) {
      await WarehouseService.recalculateUtilization(warehouseId, orgId);
    }

    return { message: 'Inventory item deleted successfully' };
  }

  // Call ML service for risk prediction
  static async predictRisk(item) {
    try {
      const features = {
        currentStock: item.currentStock,
        averageDailyDemand: item.averageDailyDemand,
        leadTimeDays: item.leadTimeDays,
        demandVariance: item.demandVariance || item.averageDailyDemand * 0.2,
        supplierRiskScore: item.supplierRiskScore || 0,
        safetyStock: item.safetyStock,
        reorderPoint: item.reorderPoint,
        incomingStockDays: item.incomingStockDays || 0,
        pendingOrderQty: item.pendingOrderQty || 0,
        isCriticalItem: item.isCriticalItem ? 1 : 0,
      };

      // PHASE 3: Validate ML features before sending to ML service
      const requiredMLFeatures = [
        'currentStock', 'averageDailyDemand', 'leadTimeDays', 'demandVariance',
        'supplierRiskScore', 'safetyStock', 'reorderPoint', 'incomingStockDays',
        'pendingOrderQty', 'isCriticalItem'
      ];
      
      // Check all required features are present
      const missingFeatures = requiredMLFeatures.filter(f => features[f] === undefined || features[f] === null);
      if (missingFeatures.length > 0) {
        console.warn(`[predictRisk] Missing ML features: ${missingFeatures.join(', ')}. Using fallback.`);
        return this.calculateLocalRiskScore(item);
      }

      // Validate all values are finite numbers
      if (!hasFiniteNumericValues(features)) {
        console.warn(`[predictRisk] Non-finite values detected. Sanitizing for ML.`);
      }
      
      // Sanitize to ensure no NaN/Infinity values slip through
      const sanitizedFeatures = sanitizeForML(features);

      // PHASE 4: Create feature version metadata
      const featureVersion = getCurrentFeatureVersion('INVENTORY');
      const predictionMetadata = createPredictionMetadata('INVENTORY', sanitizedFeatures, featureVersion);
      console.log(`[predictRisk] Prediction metadata:`, {
        featureVersion: predictionMetadata.featureVersion,
        featureCount: predictionMetadata.snapshot.featureCount,
        hash: predictionMetadata.snapshot.hash,
      });

      const response = await axios.post(`${ML_SERVICE_URL}/predict/inventory`, sanitizedFeatures, {
        timeout: 5000,
      });

      if (response.data) {
        return {
          riskScore: response.data.riskScore || 0,
          riskTier: response.data.riskTier || 'low',
          riskExplanation: response.data.explanation || '',
          shapValues: response.data.shapValues || [],
          featureVersion: predictionMetadata.featureVersion,
        };
      }
      return null;
    } catch (error) {
      console.error('ML prediction failed:', error.message);
      // Fallback: calculate basic risk score locally
      return this.calculateLocalRiskScore(item);
    }
  }

  // Local risk score calculation (fallback when ML service unavailable)
  static calculateLocalRiskScore(item) {
    let riskScore = 0;

    // Stock level risk (40% weight)
    if (item.currentStock <= 0) {
      riskScore += 40;
    } else if (item.currentStock <= item.safetyStock) {
      riskScore += 30;
    } else if (item.currentStock <= item.reorderPoint) {
      riskScore += 20;
    } else {
      const stockRatio = item.currentStock / (item.reorderPoint * 2);
      riskScore += Math.max(0, 20 - stockRatio * 20);
    }

    // Days until stockout risk (25% weight)
    const daysUntilStockout = item.averageDailyDemand > 0
      ? item.currentStock / item.averageDailyDemand
      : 999;
    if (daysUntilStockout <= item.leadTimeDays) {
      riskScore += 25;
    } else if (daysUntilStockout <= item.leadTimeDays * 1.5) {
      riskScore += 15;
    } else if (daysUntilStockout <= item.leadTimeDays * 2) {
      riskScore += 8;
    }

    // Supplier risk contribution (20% weight)
    riskScore += (item.supplierRiskScore || 0) * 0.2;

    // Critical item multiplier (15% weight)
    if (item.isCriticalItem) {
      riskScore += 15;
    }

    // Cap at 100
    riskScore = Math.min(100, Math.round(riskScore));

    // Determine tier
    let riskTier = 'low';
    if (riskScore > 80) riskTier = 'critical';
    else if (riskScore > 60) riskTier = 'high';
    else if (riskScore > 30) riskTier = 'medium';

    return {
      riskScore,
      riskTier,
      riskExplanation: `Risk calculated locally. Stock level: ${item.currentStock}, Reorder point: ${item.reorderPoint}`,
      shapValues: [],
    };
  }

  // Create risk alert — routed through AlertService for cooldown/deduplication (Audit Fix #6)
  static async createRiskAlert(item, riskData) {
    try {
      const result = await AlertService.createAlert({
        orgId: item.orgId,
        entityType: 'inventory',
        entityId: item._id,
        entityName: item.sku,
        severity: riskData.riskTier,
        title: `High Risk Inventory: ${item.sku}`,
        description: `${item.productName} has a risk score of ${riskData.riskScore}. ${riskData.riskExplanation}`,
        mitigationRecommendation: this.generateMitigationRecommendation(item, riskData),
      }, null);

      if (result.suppressed) {
        console.log(`[InventoryService] Risk alert suppressed — active duplicate exists for ${item.sku}`);
        return result.existingAlert;
      }
      return result.alert;
    } catch (err) {
      console.error('[InventoryService] Failed to create risk alert:', err.message);
      return null;
    }
  }

  // Create reorder alert — routed through AlertService for cooldown/deduplication (Audit Fix #6)
  static async createReorderAlert(item) {
    const severity = item.isCriticalItem ? 'high' : 'medium';

    try {
      const result = await AlertService.createAlert({
        orgId: item.orgId,
        entityType: 'inventory',
        entityId: item._id,
        entityName: item.sku,
        severity,
        title: `Reorder Required: ${item.sku}`,
        description: `${item.productName} has fallen below reorder point. Current stock: ${item.currentStock}, Reorder point: ${item.reorderPoint}`,
        mitigationRecommendation: `Place order for approximately ${Math.max(0, item.reorderPoint - item.currentStock + item.safetyStock)} units to restore optimal stock levels.`,
      }, null);

      if (result.suppressed) {
        console.log(`[InventoryService] Reorder alert suppressed — active duplicate exists for ${item.sku}`);
        return result.existingAlert;
      }
      return result.alert;
    } catch (err) {
      console.error('[InventoryService] Failed to create reorder alert:', err.message);
      return null;
    }
  }

  // Generate mitigation recommendation
  static generateMitigationRecommendation(item, riskData) {
    const recommendations = [];

    if (item.currentStock <= item.reorderPoint) {
      recommendations.push(`Place immediate order for ${Math.max(0, item.reorderPoint - item.currentStock + item.safetyStock)} units.`);
    }

    if (item.supplierRiskScore > 60) {
      recommendations.push('Consider identifying alternative suppliers to reduce supply risk.');
    }

    if (item.isCriticalItem && item.currentStock < item.safetyStock * 2) {
      recommendations.push('Increase safety stock levels for this critical item.');
    }

    if (item.demandVariance > item.averageDailyDemand * 0.5) {
      recommendations.push('High demand variance detected. Review forecasting methods.');
    }

    return recommendations.length > 0
      ? recommendations.join(' ')
      : 'Monitor stock levels and maintain regular reorder schedule.';
  }
}
