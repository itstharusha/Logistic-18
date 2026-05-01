import { InventoryService } from '../services/InventoryService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class InventoryController {
  // GET /api/inventory
  static listItems = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    const { warehouseId, supplierId, riskTier, isCriticalItem, search, sortBy, sortOrder } = req.query;

    const options = {
      limit,
      skip,
      warehouseId,
      supplierId,
      riskTier,
      search,
    };

    if (isCriticalItem !== undefined) {
      options.isCriticalItem = isCriticalItem === 'true';
    }

    if (sortBy) {
      options.sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    }

    const result = await InventoryService.listItems(req.user.orgId, options);
    res.json(result);
  });

  // GET /api/inventory/dashboard
  static getDashboard = asyncHandler(async (req, res) => {
    const stats = await InventoryService.getDashboardStats(req.user.orgId);
    res.json(stats);
  });

  // GET /api/inventory/reorder-list
  static getReorderList = asyncHandler(async (req, res) => {
    const items = await InventoryService.getReorderList(req.user.orgId);
    res.json({ items, total: items.length });
  });

  // GET /api/inventory/warehouses
  static getWarehouses = asyncHandler(async (req, res) => {
    const warehouses = await InventoryService.getWarehouses(req.user.orgId);
    res.json({ warehouses });
  });

  // POST /api/inventory
  static createItem = asyncHandler(async (req, res) => {
    const itemData = {
      ...req.validatedBody,
      orgId: req.user.orgId,
    };

    // Remove empty string supplierId (can't cast to ObjectId)
    if (!itemData.supplierId || itemData.supplierId === '') {
      delete itemData.supplierId;
    }

    const item = await InventoryService.createItem(itemData, req.user.userId);
    res.status(201).json({
      message: 'Inventory item created successfully',
      item,
    });
  });

  // GET /api/inventory/:itemId
  static getItem = asyncHandler(async (req, res) => {
    const item = await InventoryService.getItem(req.params.itemId, req.user.orgId);
    res.json({ item });
  });

  // PUT /api/inventory/:itemId
  static updateItem = asyncHandler(async (req, res) => {
    const updateData = { ...req.validatedBody };
    
    // Remove empty string supplierId (can't cast to ObjectId)
    if (updateData.supplierId === '') {
      delete updateData.supplierId;
    }

    const item = await InventoryService.updateItem(
      req.params.itemId,
      req.user.orgId,
      updateData,
      req.user.userId
    );
    res.json({
      message: 'Inventory item updated successfully',
      item,
    });
  });

  // PATCH /api/inventory/:itemId/stock
  static updateStock = asyncHandler(async (req, res) => {
    const { currentStock } = req.body;

    if (currentStock === undefined || currentStock < 0) {
      return res.status(400).json({ error: 'Invalid stock value' });
    }

    const item = await InventoryService.updateStock(
      req.params.itemId,
      req.user.orgId,
      currentStock,
      req.user.userId
    );
    res.json({
      message: 'Stock level updated successfully',
      item,
    });
  });

  // PATCH /api/inventory/:itemId/pending-order
  static updatePendingOrder = asyncHandler(async (req, res) => {
    const { pendingOrderQty, incomingStockDays } = req.body;

    if (pendingOrderQty === undefined || pendingOrderQty < 0) {
      return res.status(400).json({ error: 'Invalid pending order quantity' });
    }

    const item = await InventoryService.updatePendingOrder(
      req.params.itemId,
      req.user.orgId,
      pendingOrderQty,
      incomingStockDays || 0,
      req.user.userId
    );
    res.json({
      message: 'Pending order updated successfully',
      item,
    });
  });

  // GET /api/inventory/:itemId/forecast
  static getForecast = asyncHandler(async (req, res) => {
    const forecast = await InventoryService.getForecast(req.params.itemId, req.user.orgId);
    res.json({ forecast });
  });

  // DELETE /api/inventory/:itemId
  static deleteItem = asyncHandler(async (req, res) => {
    const result = await InventoryService.deleteItem(
      req.params.itemId,
      req.user.orgId,
      req.user.userId
    );
    res.json(result);
  });
}
