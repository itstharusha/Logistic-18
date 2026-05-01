import { WarehouseTransferService } from '../services/WarehouseTransferService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class WarehouseTransferController {
  // GET /api/inventory/transfers
  static listTransfers = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    const { status, fromWarehouseId, toWarehouseId, priority, sortBy, sortOrder } = req.query;

    const options = {
      limit,
      skip,
      status,
      fromWarehouseId,
      toWarehouseId,
      priority,
    };

    if (sortBy) {
      options.sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    }

    const result = await WarehouseTransferService.listTransfers(req.user.orgId, options);
    res.json(result);
  });

  // GET /api/inventory/transfers/stats
  static getTransferStats = asyncHandler(async (req, res) => {
    const stats = await WarehouseTransferService.getTransferStats(req.user.orgId);
    res.json(stats);
  });

  // POST /api/inventory/transfers
  static createTransfer = asyncHandler(async (req, res) => {
    const transferData = {
      ...req.validatedBody,
      orgId: req.user.orgId,
    };

    const transfer = await WarehouseTransferService.createTransfer(transferData, req.user.userId);
    res.status(201).json({
      message: 'Transfer request created successfully',
      transfer,
    });
  });

  // GET /api/inventory/transfers/:transferId
  static getTransfer = asyncHandler(async (req, res) => {
    const transfer = await WarehouseTransferService.getTransfer(req.params.transferId, req.user.orgId);
    res.json({ transfer });
  });

  // PATCH /api/inventory/transfers/:transferId/approve
  static approveTransfer = asyncHandler(async (req, res) => {
    const transfer = await WarehouseTransferService.approveTransfer(
      req.params.transferId,
      req.user.orgId,
      req.user.userId
    );
    res.json({
      message: 'Transfer approved and in transit',
      transfer,
    });
  });

  // PATCH /api/inventory/transfers/:transferId/complete
  static completeTransfer = asyncHandler(async (req, res) => {
    const transfer = await WarehouseTransferService.completeTransfer(
      req.params.transferId,
      req.user.orgId,
      req.user.userId
    );
    res.json({
      message: 'Transfer completed successfully',
      transfer,
    });
  });

  // PATCH /api/inventory/transfers/:transferId/cancel
  static cancelTransfer = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const transfer = await WarehouseTransferService.cancelTransfer(
      req.params.transferId,
      req.user.orgId,
      req.user.userId,
      reason
    );
    res.json({
      message: 'Transfer cancelled',
      transfer,
    });
  });

  // GET /api/inventory/transfers/warehouse/:warehouseId
  static getWarehousePendingTransfers = asyncHandler(async (req, res) => {
    const direction = req.query.direction || 'both';
    const transfers = await WarehouseTransferService.getPendingTransfers(
      req.params.warehouseId,
      req.user.orgId,
      direction
    );
    res.json({ transfers });
  });

  // GET /api/inventory/transfers/item/:itemId
  static getItemTransferHistory = asyncHandler(async (req, res) => {
    const transfers = await WarehouseTransferService.getItemTransferHistory(
      req.params.itemId,
      req.user.orgId
    );
    res.json({ transfers });
  });
}
