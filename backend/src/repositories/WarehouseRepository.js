import Warehouse from '../models/Warehouse.js';

export class WarehouseRepository {
  // Create a new warehouse
  static async create(warehouseData) {
    const warehouse = new Warehouse(warehouseData);
    return warehouse.save();
  }

  // Find warehouse by ID
  static async findById(warehouseId, orgId) {
    return Warehouse.findById(warehouseId);
  }

  // Find warehouse by code
  static async findByCode(code, orgId) {
    return Warehouse.findOne({ code: code.toUpperCase() });
  }

  // Find all warehouses
  static async findByOrgId(orgId, options = {}) {
    const query = Warehouse.find({});

    // Apply filters
    if (options.status) {
      query.where('status').equals(options.status);
    }
    if (options.type) {
      query.where('type').equals(options.type);
    }
    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      query.or([
        { code: searchRegex },
        { name: searchRegex },
        { 'location.city': searchRegex },
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

    return query.exec();
  }

  // Count warehouses
  static async countByOrgId(orgId, filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    return Warehouse.countDocuments(query);
  }

  // Find active warehouses for dropdown
  static async findActiveWarehouses(orgId) {
    return Warehouse.find({ status: 'active' })
      .select('_id code name type location.city')
      .sort({ name: 1 })
      .exec();
  }

  // Update warehouse
  static async update(warehouseId, orgId, updateData) {
    return Warehouse.findByIdAndUpdate(
      warehouseId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  // Update utilization
  static async updateUtilization(warehouseId, orgId, utilization) {
    return Warehouse.findByIdAndUpdate(
      warehouseId,
      { currentUtilization: utilization, updatedAt: new Date() },
      { new: true }
    );
  }

  // Delete warehouse
  static async delete(warehouseId, orgId) {
    return Warehouse.findByIdAndDelete(warehouseId);
  }

  // Get default warehouse
  static async getDefaultWarehouse(orgId) {
    return Warehouse.findOne({ isDefault: true });
  }

  // Set default warehouse (unset others first)
  static async setDefaultWarehouse(warehouseId, orgId) {
    await Warehouse.updateMany({}, { isDefault: false });
    return Warehouse.findByIdAndUpdate(
      warehouseId,
      { isDefault: true },
      { new: true }
    );
  }

  // Get warehouse stats for dashboard
  static async getWarehouseStats(orgId) {
    const warehouses = await Warehouse.find({});
    
    const stats = {
      total: warehouses.length,
      active: warehouses.filter(w => w.status === 'active').length,
      inactive: warehouses.filter(w => w.status === 'inactive').length,
      maintenance: warehouses.filter(w => w.status === 'maintenance').length,
      totalCapacity: warehouses.reduce((sum, w) => sum + (w.capacity || 0), 0),
      totalUtilization: warehouses.reduce((sum, w) => sum + (w.currentUtilization || 0), 0),
      byType: {},
    };

    // Count by type
    warehouses.forEach(w => {
      stats.byType[w.type] = (stats.byType[w.type] || 0) + 1;
    });

    // Average utilization percentage
    stats.avgUtilizationPercent = stats.totalCapacity > 0
      ? Math.round((stats.totalUtilization / stats.totalCapacity) * 100)
      : 0;

    return stats;
  }
}
