import { WarehouseRepository } from '../repositories/WarehouseRepository.js';
import { InventoryRepository } from '../repositories/InventoryRepository.js';
import AuditLog from '../models/AuditLog.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

export class WarehouseService {
  // Create a new warehouse
  static async createWarehouse(warehouseData, userId) {
    // Check if code already exists in organization
    const existingWarehouse = await WarehouseRepository.findByCode(warehouseData.code, warehouseData.orgId);
    if (existingWarehouse) {
      throw new ConflictError('Warehouse code already exists in this organization');
    }

    // Create the warehouse
    const warehouse = await WarehouseRepository.create(warehouseData);

    // Log audit
    await AuditLog.create({
      orgId: warehouseData.orgId,
      userId,
      action: 'WAREHOUSE_CREATED',
      entityType: 'WAREHOUSE',
      entityId: warehouse._id,
      newValue: warehouseData,
    });

    return warehouse;
  }

  // Get warehouse by ID
  static async getWarehouse(warehouseId, orgId) {
    const warehouse = await WarehouseRepository.findById(warehouseId, orgId);
    if (!warehouse) {
      throw new NotFoundError('Warehouse not found');
    }
    return warehouse;
  }

  // List warehouses with filters
  static async listWarehouses(orgId, options = {}) {
    const warehouses = await WarehouseRepository.findByOrgId(orgId, options);
    const total = await WarehouseRepository.countByOrgId(orgId, options);

    return {
      warehouses,
      total,
      limit: options.limit || 20,
      skip: options.skip || 0,
    };
  }

  // Get active warehouses for dropdown
  static async getActiveWarehouses(orgId) {
    return WarehouseRepository.findActiveWarehouses(orgId);
  }

  // Update warehouse
  static async updateWarehouse(warehouseId, orgId, updateData, userId) {
    const existingWarehouse = await WarehouseRepository.findById(warehouseId, orgId);
    if (!existingWarehouse) {
      throw new NotFoundError('Warehouse not found');
    }

    // If code is being changed, check uniqueness
    if (updateData.code && updateData.code !== existingWarehouse.code) {
      const codeExists = await WarehouseRepository.findByCode(updateData.code, orgId);
      if (codeExists) {
        throw new ConflictError('Warehouse code already exists in this organization');
      }
    }

    const oldValue = existingWarehouse.toObject();
    const warehouse = await WarehouseRepository.update(warehouseId, orgId, updateData);

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'WAREHOUSE_UPDATED',
      entityType: 'WAREHOUSE',
      entityId: warehouseId,
      oldValue,
      newValue: updateData,
    });

    return warehouse;
  }

  // Delete warehouse
  static async deleteWarehouse(warehouseId, orgId, userId) {
    const warehouse = await WarehouseRepository.findById(warehouseId, orgId);
    if (!warehouse) {
      throw new NotFoundError('Warehouse not found');
    }

    // Check if any inventory items are using this warehouse
    const itemsInWarehouse = await InventoryRepository.countByWarehouse(warehouseId, orgId);
    if (itemsInWarehouse > 0) {
      throw new ValidationError(`Cannot delete warehouse: ${itemsInWarehouse} inventory items are assigned to it. Transfer or delete items first.`);
    }

    await WarehouseRepository.delete(warehouseId, orgId);

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'WAREHOUSE_DELETED',
      entityType: 'WAREHOUSE',
      entityId: warehouseId,
      oldValue: warehouse.toObject(),
    });

    return { message: 'Warehouse deleted successfully' };
  }

  // Set default warehouse
  static async setDefaultWarehouse(warehouseId, orgId, userId) {
    const warehouse = await WarehouseRepository.findById(warehouseId, orgId);
    if (!warehouse) {
      throw new NotFoundError('Warehouse not found');
    }

    const updatedWarehouse = await WarehouseRepository.setDefaultWarehouse(warehouseId, orgId);

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'WAREHOUSE_SET_DEFAULT',
      entityType: 'WAREHOUSE',
      entityId: warehouseId,
    });

    return updatedWarehouse;
  }

  // Get warehouse stats
  static async getWarehouseStats(orgId) {
    return WarehouseRepository.getWarehouseStats(orgId);
  }

  // Get warehouse with inventory summary
  static async getWarehouseWithInventory(warehouseId, orgId) {
    const warehouse = await WarehouseRepository.findById(warehouseId, orgId);
    if (!warehouse) {
      throw new NotFoundError('Warehouse not found');
    }

    // Get inventory items in this warehouse
    const inventorySummary = await InventoryRepository.getWarehouseSummary(warehouseId, orgId);

    return {
      ...warehouse.toObject(),
      inventorySummary,
    };
  }

  // Calculate and update utilization for a warehouse
  static async recalculateUtilization(warehouseId, orgId) {
    const totalStock = await InventoryRepository.getTotalStockInWarehouse(warehouseId, orgId);
    return WarehouseRepository.updateUtilization(warehouseId, orgId, totalStock);
  }
}
