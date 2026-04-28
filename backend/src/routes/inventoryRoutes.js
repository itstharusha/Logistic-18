import express from 'express';
import { InventoryController } from '../controllers/InventoryController.js';
import { WarehouseController } from '../controllers/WarehouseController.js';
import { WarehouseTransferController } from '../controllers/WarehouseTransferController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { ROLES } from '../config/rbac.constants.js';

const router = express.Router();

// ==========================================
// INVENTORY MANAGEMENT MODULE (Wijemanna)
// ==========================================

// All routes require authentication
router.use(authenticate);

// ==========================================
// DASHBOARD ROUTES
// ==========================================

// Dashboard stats (ORG_ADMIN, INVENTORY_MANAGER, VIEWER can view)
router.get('/dashboard', authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER, ROLES.VIEWER]), InventoryController.getDashboard);

// Get items needing reorder
router.get('/reorder-list', InventoryController.getReorderList);

// ==========================================
// WAREHOUSE MANAGEMENT ROUTES
// ==========================================

// Get active warehouses for dropdowns
router.get('/warehouses/active', WarehouseController.getActiveWarehouses);

// Get warehouse statistics
router.get('/warehouses/stats', WarehouseController.getWarehouseStats);

// List all warehouses
router.get('/warehouses', WarehouseController.listWarehouses);

// Create warehouse (ORG_ADMIN, INVENTORY_MANAGER)
router.post(
  '/warehouses',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  validate('createWarehouse'),
  WarehouseController.createWarehouse
);

// Get specific warehouse
router.get('/warehouses/:warehouseId', WarehouseController.getWarehouse);

// Get warehouse with inventory summary
router.get('/warehouses/:warehouseId/inventory', WarehouseController.getWarehouseWithInventory);

// Update warehouse (ORG_ADMIN, INVENTORY_MANAGER)
router.put(
  '/warehouses/:warehouseId',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  validate('updateWarehouse'),
  WarehouseController.updateWarehouse
);

// Set default warehouse (ORG_ADMIN, INVENTORY_MANAGER)
router.patch(
  '/warehouses/:warehouseId/default',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  WarehouseController.setDefaultWarehouse
);

// Delete warehouse (ORG_ADMIN only)
router.delete(
  '/warehouses/:warehouseId',
  authorize([ROLES.ORG_ADMIN]),
  WarehouseController.deleteWarehouse
);

// ==========================================
// WAREHOUSE TRANSFER ROUTES
// ==========================================

// Get transfer statistics
router.get('/transfers/stats', WarehouseTransferController.getTransferStats);

// Get transfers for a specific warehouse
router.get('/transfers/warehouse/:warehouseId', WarehouseTransferController.getWarehousePendingTransfers);

// Get transfer history for an item
router.get('/transfers/item/:itemId', WarehouseTransferController.getItemTransferHistory);

// List all transfers
router.get('/transfers', WarehouseTransferController.listTransfers);

// Create transfer request (ORG_ADMIN, INVENTORY_MANAGER)
router.post(
  '/transfers',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  validate('createTransfer'),
  WarehouseTransferController.createTransfer
);

// Get specific transfer
router.get('/transfers/:transferId', WarehouseTransferController.getTransfer);

// Approve transfer (ORG_ADMIN, INVENTORY_MANAGER)
router.patch(
  '/transfers/:transferId/approve',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  WarehouseTransferController.approveTransfer
);

// Complete transfer (ORG_ADMIN, INVENTORY_MANAGER)
router.patch(
  '/transfers/:transferId/complete',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  WarehouseTransferController.completeTransfer
);

// Cancel transfer (ORG_ADMIN, INVENTORY_MANAGER)
router.patch(
  '/transfers/:transferId/cancel',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  WarehouseTransferController.cancelTransfer
);

// ==========================================
// INVENTORY ITEM ROUTES
// ==========================================

// List inventory items (with filters)
router.get('/', InventoryController.listItems);

// Create inventory item (ORG_ADMIN, INVENTORY_MANAGER)
router.post(
  '/',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  validate('createInventoryItem'),
  InventoryController.createItem
);

// Get specific inventory item
router.get('/:itemId', InventoryController.getItem);

// Update inventory item (ORG_ADMIN, INVENTORY_MANAGER)
router.put(
  '/:itemId',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  validate('updateInventoryItem'),
  InventoryController.updateItem
);

// Update stock level only (ORG_ADMIN, INVENTORY_MANAGER)
router.patch(
  '/:itemId/stock',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  InventoryController.updateStock
);

// Update pending order (ORG_ADMIN, INVENTORY_MANAGER)
router.patch(
  '/:itemId/pending-order',
  authorize([ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER]),
  InventoryController.updatePendingOrder
);

// Get demand forecast for item
router.get('/:itemId/forecast', InventoryController.getForecast);

// Delete inventory item (ORG_ADMIN only)
router.delete(
  '/:itemId',
  authorize([ROLES.ORG_ADMIN]),
  InventoryController.deleteItem
);

export default router;
