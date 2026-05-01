/**
 * shipmentRoutes.js — Express Router for Shipment Management API
 *
 * Responsibility:
 *   Defines all HTTP routes for the shipment module and maps them to the
 *   appropriate ShipmentController handler, with authentication, RBAC,
 *   Joi validation, and ObjectId param validation middleware.
 *
 *   Base path: /api/shipments (mounted in app.js)
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateObjectId, sanitizeQuery } from '../middleware/validation.js';
import { ShipmentController } from '../controllers/ShipmentController.js';

const router = express.Router();

// List all shipments for the org (all roles can view)
router.get('/', authenticate, sanitizeQuery, ShipmentController.listShipments);

// Register a new shipment — restricted to operators and admins
router.post('/',
    authenticate,
    authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']),
    validate('createShipment'),
    ShipmentController.createShipment
);

// Get a single shipment's full detail (all roles can view)
router.get('/:shipmentId', authenticate, validateObjectId('shipmentId'), ShipmentController.getShipment);

// Update shipment fields — restricted to operators and admins
router.put('/:shipmentId',
    authenticate,
    validateObjectId('shipmentId'),
    authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']),
    validate('updateShipment'),
    ShipmentController.updateShipment
);

// Advance the shipment status through the workflow state machine
router.patch('/:shipmentId/status',
    authenticate,
    validateObjectId('shipmentId'),
    authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']),
    validate('updateShipmentStatus'),
    ShipmentController.updateStatus
);

// Get the ordered tracking events timeline for the detail page
router.get('/:shipmentId/tracking', authenticate, validateObjectId('shipmentId'), ShipmentController.getTrackingEvents);

export default router;
