import { WarehouseTransferRepository } from '../repositories/WarehouseTransferRepository.js';
import { WarehouseRepository } from '../repositories/WarehouseRepository.js';
import { InventoryRepository } from '../repositories/InventoryRepository.js';
import { WarehouseService } from './WarehouseService.js';
import AuditLog from '../models/AuditLog.js';
import Alert from '../models/Alert.js';

export class WarehouseTransferService {
  // Create a new transfer request
  static async createTransfer(transferData, userId) {
    // Validate source and destination are different
    if (transferData.fromWarehouseId === transferData.toWarehouseId) {
      throw new Error('Source and destination warehouse cannot be the same');
    }

    // Validate warehouses exist
    const [fromWarehouse, toWarehouse] = await Promise.all([
      WarehouseRepository.findById(transferData.fromWarehouseId, transferData.orgId),
      WarehouseRepository.findById(transferData.toWarehouseId, transferData.orgId),
    ]);

    if (!fromWarehouse) {
      throw new Error('Source warehouse not found');
    }
    if (!toWarehouse) {
      throw new Error('Destination warehouse not found');
    }

    // Get the inventory item to check stock
    const inventoryItem = await InventoryRepository.findById(transferData.inventoryItemId, transferData.orgId);
    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }

    // Check if item is in the source warehouse
    if (inventoryItem.warehouseId.toString() !== transferData.fromWarehouseId) {
      throw new Error('Inventory item is not in the source warehouse');
    }

    // Check if sufficient stock is available
    if (inventoryItem.currentStock < transferData.quantity) {
      throw new Error(`Insufficient stock. Available: ${inventoryItem.currentStock}, Requested: ${transferData.quantity}`);
    }

    // Create the transfer
    const transfer = await WarehouseTransferRepository.create({
      ...transferData,
      requestedBy: userId,
      requestedAt: new Date(),
    });

    // Log audit
    await AuditLog.create({
      orgId: transferData.orgId,
      userId,
      action: 'WAREHOUSE_TRANSFER_CREATED',
      entityType: 'WAREHOUSE_TRANSFER',
      entityId: transfer._id,
      newValue: transferData,
    });

    return transfer;
  }

  // Get transfer by ID
  static async getTransfer(transferId, orgId) {
    const transfer = await WarehouseTransferRepository.findById(transferId, orgId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }
    return transfer;
  }

  // List transfers with filters
  static async listTransfers(orgId, options = {}) {
    const transfers = await WarehouseTransferRepository.findByOrgId(orgId, options);
    const total = await WarehouseTransferRepository.countByOrgId(orgId, options);

    return {
      transfers,
      total,
      limit: options.limit || 20,
      skip: options.skip || 0,
    };
  }

  // Approve a transfer (changes status to in-transit)
  static async approveTransfer(transferId, orgId, userId) {
    const transfer = await WarehouseTransferRepository.findById(transferId, orgId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'pending') {
      throw new Error('Only pending transfers can be approved');
    }

    // Verify stock is still available
    const inventoryItem = await InventoryRepository.findById(transfer.inventoryItemId._id || transfer.inventoryItemId, orgId);
    if (!inventoryItem || inventoryItem.currentStock < transfer.quantity) {
      throw new Error('Insufficient stock to approve transfer');
    }

    // Deduct stock from source (reserve for transfer)
    await InventoryRepository.updateStock(inventoryItem._id, orgId, inventoryItem.currentStock - transfer.quantity);

    const updatedTransfer = await WarehouseTransferRepository.update(transferId, orgId, {
      status: 'in-transit',
      approvedBy: userId,
      approvedAt: new Date(),
    });

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'WAREHOUSE_TRANSFER_APPROVED',
      entityType: 'WAREHOUSE_TRANSFER',
      entityId: transferId,
    });

    // Update source warehouse utilization (stock was deducted)
    const fromWarehouseId = transfer.fromWarehouseId._id || transfer.fromWarehouseId;
    await WarehouseService.recalculateUtilization(fromWarehouseId, orgId);

    return updatedTransfer;
  }

  // Complete a transfer
  static async completeTransfer(transferId, orgId, userId) {
    const transfer = await WarehouseTransferRepository.findById(transferId, orgId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'in-transit') {
      throw new Error('Only in-transit transfers can be completed');
    }

    // Create new inventory item in destination warehouse or update existing
    const sourceItem = await InventoryRepository.findById(transfer.inventoryItemId._id || transfer.inventoryItemId, orgId);
    
    // Check if item with same SKU exists in destination warehouse
    const existingDestItem = await InventoryRepository.findBySkuAndWarehouse(
      sourceItem.sku,
      transfer.toWarehouseId._id || transfer.toWarehouseId,
      orgId
    );

    if (existingDestItem) {
      // Add stock to existing item
      await InventoryRepository.updateStock(
        existingDestItem._id,
        orgId,
        existingDestItem.currentStock + transfer.quantity
      );
    } else {
      // Create new item in destination warehouse
      const newItemData = {
        orgId,
        sku: sourceItem.sku,
        productName: sourceItem.productName,
        warehouseId: transfer.toWarehouseId._id || transfer.toWarehouseId,
        supplierId: sourceItem.supplierId,
        currentStock: transfer.quantity,
        averageDailyDemand: sourceItem.averageDailyDemand,
        leadTimeDays: sourceItem.leadTimeDays,
        demandVariance: sourceItem.demandVariance,
        isCriticalItem: sourceItem.isCriticalItem,
        supplierRiskScore: sourceItem.supplierRiskScore,
      };
      await InventoryRepository.create(newItemData);
    }

    const updatedTransfer = await WarehouseTransferRepository.update(transferId, orgId, {
      status: 'completed',
      completedBy: userId,
      completedAt: new Date(),
    });

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'WAREHOUSE_TRANSFER_COMPLETED',
      entityType: 'WAREHOUSE_TRANSFER',
      entityId: transferId,
    });

    // Update warehouse utilizations
    const fromWarehouseId = transfer.fromWarehouseId._id || transfer.fromWarehouseId;
    const toWarehouseIdValue = transfer.toWarehouseId._id || transfer.toWarehouseId;
    await Promise.all([
      WarehouseService.recalculateUtilization(fromWarehouseId, orgId),
      WarehouseService.recalculateUtilization(toWarehouseIdValue, orgId),
    ]);

    return updatedTransfer;
  }

  // Cancel a transfer
  static async cancelTransfer(transferId, orgId, userId, reason = '') {
    const transfer = await WarehouseTransferRepository.findById(transferId, orgId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status === 'completed' || transfer.status === 'cancelled') {
      throw new Error('Cannot cancel a completed or already cancelled transfer');
    }

    // If transfer was in-transit, restore stock to source
    if (transfer.status === 'in-transit') {
      const inventoryItem = await InventoryRepository.findById(transfer.inventoryItemId._id || transfer.inventoryItemId, orgId);
      if (inventoryItem) {
        await InventoryRepository.updateStock(inventoryItem._id, orgId, inventoryItem.currentStock + transfer.quantity);
      }
    }

    const updatedTransfer = await WarehouseTransferRepository.update(transferId, orgId, {
      status: 'cancelled',
      notes: reason ? `Cancelled: ${reason}` : transfer.notes,
    });

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'WAREHOUSE_TRANSFER_CANCELLED',
      entityType: 'WAREHOUSE_TRANSFER',
      entityId: transferId,
      newValue: { reason },
    });

    // Update source warehouse utilization if stock was restored
    if (transfer.status === 'in-transit') {
      const fromWarehouseId = transfer.fromWarehouseId._id || transfer.fromWarehouseId;
      await WarehouseService.recalculateUtilization(fromWarehouseId, orgId);
    }

    return updatedTransfer;
  }

  // Get transfer statistics
  static async getTransferStats(orgId) {
    return WarehouseTransferRepository.getTransferStats(orgId);
  }

  // Get pending transfers for a warehouse
  static async getPendingTransfers(warehouseId, orgId, direction = 'both') {
    return WarehouseTransferRepository.getPendingTransfers(warehouseId, orgId, direction);
  }

  // Get transfer history for an inventory item
  static async getItemTransferHistory(inventoryItemId, orgId) {
    return WarehouseTransferRepository.getByInventoryItem(inventoryItemId, orgId);
  }
}
