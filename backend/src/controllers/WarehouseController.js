import { WarehouseService } from '../services/WarehouseService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class WarehouseController {
  // GET /api/inventory/warehouses
  static listWarehouses = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    const { status, type, search, sortBy, sortOrder } = req.query;

    const options = {
      limit,
      skip,
      status,
      type,
      search,
    };

    if (sortBy) {
      options.sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    }

    const result = await WarehouseService.listWarehouses(req.user.orgId, options);
    res.json(result);
  });

  // GET /api/inventory/warehouses/active
  static getActiveWarehouses = asyncHandler(async (req, res) => {
    const warehouses = await WarehouseService.getActiveWarehouses(req.user.orgId);
    res.json({ warehouses });
  });

  // GET /api/inventory/warehouses/stats
  static getWarehouseStats = asyncHandler(async (req, res) => {
    const stats = await WarehouseService.getWarehouseStats(req.user.orgId);
    res.json(stats);
  });

  // POST /api/inventory/warehouses
  static createWarehouse = asyncHandler(async (req, res) => {
    const warehouseData = {
      ...req.validatedBody,
      orgId: req.user.orgId,
    };

    const warehouse = await WarehouseService.createWarehouse(warehouseData, req.user.userId);
    res.status(201).json({
      message: 'Warehouse created successfully',
      warehouse,
    });
  });

  // GET /api/inventory/warehouses/:warehouseId
  static getWarehouse = asyncHandler(async (req, res) => {
    const warehouse = await WarehouseService.getWarehouse(req.params.warehouseId, req.user.orgId);
    res.json({ warehouse });
  });

  // GET /api/inventory/warehouses/:warehouseId/inventory
  static getWarehouseWithInventory = asyncHandler(async (req, res) => {
    const warehouse = await WarehouseService.getWarehouseWithInventory(req.params.warehouseId, req.user.orgId);
    res.json({ warehouse });
  });

  // PUT /api/inventory/warehouses/:warehouseId
  static updateWarehouse = asyncHandler(async (req, res) => {
    const warehouse = await WarehouseService.updateWarehouse(
      req.params.warehouseId,
      req.user.orgId,
      req.validatedBody,
      req.user.userId
    );
    res.json({
      message: 'Warehouse updated successfully',
      warehouse,
    });
  });

  // PATCH /api/inventory/warehouses/:warehouseId/default
  static setDefaultWarehouse = asyncHandler(async (req, res) => {
    const warehouse = await WarehouseService.setDefaultWarehouse(
      req.params.warehouseId,
      req.user.orgId,
      req.user.userId
    );
    res.json({
      message: 'Default warehouse set successfully',
      warehouse,
    });
  });

  // DELETE /api/inventory/warehouses/:warehouseId
  static deleteWarehouse = asyncHandler(async (req, res) => {
    const result = await WarehouseService.deleteWarehouse(
      req.params.warehouseId,
      req.user.orgId,
      req.user.userId
    );
    res.json(result);
  });
}
