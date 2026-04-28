import WarehouseTransfer from '../models/WarehouseTransfer.js';

export class WarehouseTransferRepository {
  // Create a new transfer
  static async create(transferData) {
    const transfer = new WarehouseTransfer(transferData);
    return transfer.save();
  }

  // Find transfer by ID
  static async findById(transferId, orgId) {
    return WarehouseTransfer.findById(transferId)
      .populate('inventoryItemId', 'sku productName')
      .populate('fromWarehouseId', 'code name location')
      .populate('toWarehouseId', 'code name location')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('completedBy', 'name email')
      .populate('shipmentId', 'shipmentNumber status shipmentType');
  }

  // Find all transfers
  static async findByOrgId(orgId, options = {}) {
    const query = WarehouseTransfer.find({});

    // Apply filters
    if (options.status) {
      query.where('status').equals(options.status);
    }
    if (options.fromWarehouseId) {
      query.where('fromWarehouseId').equals(options.fromWarehouseId);
    }
    if (options.toWarehouseId) {
      query.where('toWarehouseId').equals(options.toWarehouseId);
    }
    if (options.inventoryItemId) {
      query.where('inventoryItemId').equals(options.inventoryItemId);
    }
    if (options.priority) {
      query.where('priority').equals(options.priority);
    }

    // Pagination and sorting
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ createdAt: -1 });
    }

    // Populate references
    query.populate('inventoryItemId', 'sku productName')
      .populate('fromWarehouseId', 'code name')
      .populate('toWarehouseId', 'code name')
      .populate('requestedBy', 'name')
      .populate('shipmentId', 'shipmentNumber status shipmentType');

    return query.exec();
  }

  // Count transfers
  static async countByOrgId(orgId, filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.fromWarehouseId) query.fromWarehouseId = filters.fromWarehouseId;
    if (filters.toWarehouseId) query.toWarehouseId = filters.toWarehouseId;
    return WarehouseTransfer.countDocuments(query);
  }

  // Update transfer
  static async update(transferId, orgId, updateData) {
    return WarehouseTransfer.findByIdAndUpdate(
      transferId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('inventoryItemId', 'sku productName')
      .populate('fromWarehouseId', 'code name')
      .populate('toWarehouseId', 'code name');
  }

  // Get pending transfers for a warehouse
  static async getPendingTransfers(warehouseId, orgId, direction = 'both') {
    const query = { status: { $in: ['pending', 'in-transit'] } };
    
    if (direction === 'outgoing') {
      query.fromWarehouseId = warehouseId;
    } else if (direction === 'incoming') {
      query.toWarehouseId = warehouseId;
    } else {
      query.$or = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
    }

    return WarehouseTransfer.find(query)
      .populate('inventoryItemId', 'sku productName')
      .populate('fromWarehouseId', 'code name')
      .populate('toWarehouseId', 'code name')
      .sort({ createdAt: -1 });
  }

  // Get transfer statistics
  static async getTransferStats(orgId) {
    const transfers = await WarehouseTransfer.find({});
    
    const stats = {
      total: transfers.length,
      pending: transfers.filter(t => t.status === 'pending').length,
      inTransit: transfers.filter(t => t.status === 'in-transit').length,
      completed: transfers.filter(t => t.status === 'completed').length,
      cancelled: transfers.filter(t => t.status === 'cancelled').length,
      byPriority: {},
    };

    // Count by priority
    transfers.forEach(t => {
      stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;
    });

    // Recent transfers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    stats.recentTransfers = transfers.filter(t => new Date(t.createdAt) >= thirtyDaysAgo).length;

    return stats;
  }

  // Get transfers for an inventory item
  static async getByInventoryItem(inventoryItemId, orgId) {
    return WarehouseTransfer.find({ inventoryItemId })
      .populate('fromWarehouseId', 'code name')
      .populate('toWarehouseId', 'code name')
      .sort({ createdAt: -1 });
  }
}
