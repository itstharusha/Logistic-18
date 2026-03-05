import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ShipmentController } from '../controllers/ShipmentController.js';

const router = express.Router();

// GET  /api/shipments — list all shipments (all authenticated roles)
router.get('/', authenticate, ShipmentController.listShipments);

// POST /api/shipments — register new shipment (ORG_ADMIN, LOGISTICS_OPERATOR)
router.post('/', authenticate, authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']), ShipmentController.createShipment);

// GET  /api/shipments/:shipmentId — get shipment detail (all authenticated roles)
router.get('/:shipmentId', authenticate, ShipmentController.getShipment);

// PUT  /api/shipments/:shipmentId — update shipment (ORG_ADMIN, LOGISTICS_OPERATOR)
router.put('/:shipmentId', authenticate, authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']), ShipmentController.updateShipment);

// PATCH /api/shipments/:shipmentId/status — change shipment status (ORG_ADMIN, LOGISTICS_OPERATOR)
router.patch('/:shipmentId/status', authenticate, authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']), ShipmentController.updateStatus);

// GET  /api/shipments/:shipmentId/tracking — get tracking events timeline (all authenticated roles)
router.get('/:shipmentId/tracking', authenticate, ShipmentController.getTrackingEvents);

export default router;
