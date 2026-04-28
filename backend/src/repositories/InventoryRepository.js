import InventoryItem from '../models/InventoryItem.js';

export class InventoryRepository {
  // Create a new inventory item
  static async create(itemData) {
    const item = new InventoryItem(itemData);
    return item.save();
  }

  // Find inventory item by ID
  static async findById(itemId, orgId) {
    return InventoryItem.findById(itemId);
  }

  // Find inventory item by SKU
  static async findBySku(sku, orgId) {
    return InventoryItem.findOne({ sku: sku.toUpperCase() });
  }

  // Find all inventory items with filters
  static async findByOrgId(orgId, options = {}) {
    const query = InventoryItem.find({});

    // Apply filters
    if (options.warehouseId) {
      query.where('warehouseId').equals(options.warehouseId);
    }
    if (options.supplierId) {
      query.where('supplierId').equals(options.supplierId);
    }
    if (options.riskTier) {
      query.where('riskTier').equals(options.riskTier);
    }
    if (options.isCriticalItem !== undefined) {
      query.where('isCriticalItem').equals(options.isCriticalItem);
    }
    if (options.needsReorder) {
      query.where('currentStock').lte(query.getQuery().reorderPoint || 0);
    }

    // Apply search if provided
    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      query.or([
        { sku: searchRegex },
        { productName: searchRegex },
        { warehouseId: searchRegex },
      ]);
    }

    // Pagination and sorting
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ createdAt: -1 });
    }

    // Populate supplier and warehouse info
    if (options.populate) {
      query.populate('supplierId', 'name country riskScore riskTier');
      query.populate('warehouseId', 'code name type');
    }

    return query.exec();
  }

  // Count inventory items
  static async countByOrgId(orgId, filters = {}) {
    const query = {};
    
    if (filters.warehouseId) query.warehouseId = filters.warehouseId;
    if (filters.supplierId) query.supplierId = filters.supplierId;
    if (filters.riskTier) query.riskTier = filters.riskTier;
    if (filters.isCriticalItem !== undefined) query.isCriticalItem = filters.isCriticalItem;

    return InventoryItem.countDocuments(query);
  }

  // Update inventory item
  static async update(itemId, orgId, updateData) {
    return InventoryItem.findByIdAndUpdate(
      itemId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  // Update stock level
  static async updateStock(itemId, orgId, newStock) {
    return InventoryItem.findByIdAndUpdate(
      itemId,
      { currentStock: newStock, lastUpdatedAt: new Date(), updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  // Update risk score and tier
  static async updateRiskScore(itemId, orgId, riskData) {
    return InventoryItem.findByIdAndUpdate(
      itemId,
      {
        riskScore: riskData.riskScore,
        riskTier: riskData.riskTier,
        riskExplanation: riskData.riskExplanation || '',
        shapValues: riskData.shapValues || [],
        lastScoredAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  // Update pending order
  static async updatePendingOrder(itemId, orgId, pendingQty, incomingDays) {
    return InventoryItem.findByIdAndUpdate(
      itemId,
      {
        pendingOrderQty: pendingQty,
        incomingStockDays: incomingDays,
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  // Find items needing reorder
  static async findItemsNeedingReorder(orgId) {
    return InventoryItem.find({
      $expr: { $lte: ['$currentStock', '$reorderPoint'] },
    }).sort({ riskScore: -1 });
  }

  // Find items by risk tier
  static async findByRiskTier(orgId, tier) {
    return InventoryItem.find({ riskTier: tier }).sort({ riskScore: -1 });
  }

  // Find critical items
  static async findCriticalItems(orgId) {
    return InventoryItem.find({ isCriticalItem: true }).sort({ riskScore: -1 });
  }

  // Find items at risk (high or critical tier)
  static async findAtRiskItems(orgId) {
    return InventoryItem.find({
      riskTier: { $in: ['high', 'critical'] },
    }).sort({ riskScore: -1 });
  }

  // Get inventory summary statistics
  static async getSummaryStats(orgId) {
    const stats = await InventoryItem.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          avgRiskScore: { $avg: '$riskScore' },
          criticalItems: {
            $sum: { $cond: [{ $eq: ['$isCriticalItem', true] }, 1, 0] },
          },
          lowRisk: {
            $sum: { $cond: [{ $eq: ['$riskTier', 'low'] }, 1, 0] },
          },
          mediumRisk: {
            $sum: { $cond: [{ $eq: ['$riskTier', 'medium'] }, 1, 0] },
          },
          highRisk: {
            $sum: { $cond: [{ $eq: ['$riskTier', 'high'] }, 1, 0] },
          },
          criticalRisk: {
            $sum: { $cond: [{ $eq: ['$riskTier', 'critical'] }, 1, 0] },
          },
        },
      },
    ]);

    return stats[0] || {
      totalItems: 0,
      totalStock: 0,
      avgRiskScore: 0,
      criticalItems: 0,
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0,
      criticalRisk: 0,
    };
  }

  // Get items below reorder point count
  static async countBelowReorderPoint(orgId) {
    return InventoryItem.countDocuments({
      $expr: { $lte: ['$currentStock', '$reorderPoint'] },
    });
  }

  // Get warehouse summary
  static async getWarehouseSummary(orgId) {
    return InventoryItem.aggregate([
      {
        $group: {
          _id: '$warehouseId',
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          avgRiskScore: { $avg: '$riskScore' },
          criticalItems: {
            $sum: { $cond: [{ $eq: ['$isCriticalItem', true] }, 1, 0] },
          },
        },
      },
      { $sort: { totalItems: -1 } },
    ]);
  }

  // Delete inventory item
  static async delete(itemId, orgId) {
    return InventoryItem.findByIdAndDelete(itemId);
  }

  // Bulk update supplier risk scores
  static async bulkUpdateSupplierRisk(orgId, supplierId, supplierRiskScore) {
    return InventoryItem.updateMany(
      { supplierId },
      { supplierRiskScore, updatedAt: new Date() }
    );
  }

  // Find all items for a supplier
  static async findBySupplier(orgId, supplierId, options = {}) {
    const query = InventoryItem.find({ supplierId });
    
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);
    if (options.sort) query.sort(options.sort);

    return query.exec();
  }

  // Get unique warehouses
  static async getWarehouses(orgId) {
    return InventoryItem.distinct('warehouseId');
  }

  // Count items in a specific warehouse
  static async countByWarehouse(warehouseId, orgId) {
    return InventoryItem.countDocuments({ warehouseId });
  }

  // Find item by SKU and warehouse
  static async findBySkuAndWarehouse(sku, warehouseId, orgId) {
    return InventoryItem.findOne({ sku: sku.toUpperCase(), warehouseId });
  }

  // Get total stock in a warehouse
  static async getTotalStockInWarehouse(warehouseId, orgId) {
    const mongoose = (await import('mongoose')).default;
    const result = await InventoryItem.aggregate([
      { $match: { warehouseId: new mongoose.Types.ObjectId(warehouseId) } },
      { $group: { _id: null, totalStock: { $sum: '$currentStock' } } },
    ]);
    return result[0]?.totalStock || 0;
  }

  // Get warehouse-specific inventory summary
  static async getWarehouseInventorySummary(warehouseId, orgId) {
    const mongoose = (await import('mongoose')).default;
    const result = await InventoryItem.aggregate([
      { $match: { warehouseId: new mongoose.Types.ObjectId(warehouseId) } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          avgRiskScore: { $avg: '$riskScore' },
          criticalItems: { $sum: { $cond: [{ $eq: ['$isCriticalItem', true] }, 1, 0] } },
          lowRisk: { $sum: { $cond: [{ $eq: ['$riskTier', 'low'] }, 1, 0] } },
          mediumRisk: { $sum: { $cond: [{ $eq: ['$riskTier', 'medium'] }, 1, 0] } },
          highRisk: { $sum: { $cond: [{ $eq: ['$riskTier', 'high'] }, 1, 0] } },
          criticalRisk: { $sum: { $cond: [{ $eq: ['$riskTier', 'critical'] }, 1, 0] } },
          belowReorder: { $sum: { $cond: [{ $lte: ['$currentStock', '$reorderPoint'] }, 1, 0] } },
        },
      },
    ]);
    return result[0] || {
      totalItems: 0,
      totalStock: 0,
      avgRiskScore: 0,
      criticalItems: 0,
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0,
      criticalRisk: 0,
      belowReorder: 0,
    };
  }

  // Get items grouped by warehouse
  static async getItemsByWarehouse(orgId) {
    return InventoryItem.aggregate([
      {
        $group: {
          _id: '$warehouseId',
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          avgRiskScore: { $avg: '$riskScore' },
          criticalItems: { $sum: { $cond: [{ $eq: ['$isCriticalItem', true] }, 1, 0] } },
          belowReorder: { $sum: { $cond: [{ $lte: ['$currentStock', '$reorderPoint'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          warehouseId: '$_id',
          warehouseCode: '$warehouse.code',
          warehouseName: '$warehouse.name',
          warehouseType: '$warehouse.type',
          totalItems: 1,
          totalStock: 1,
          avgRiskScore: 1,
          criticalItems: 1,
          belowReorder: 1,
        },
      },
      { $sort: { totalItems: -1 } },
    ]);
  }
}
