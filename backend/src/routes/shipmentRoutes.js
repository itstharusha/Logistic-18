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
import { ROLES } from '../config/rbac.constants.js';

const router = express.Router();

// List all shipments for the org
// Requires: ORG_ADMIN, LOGISTICS_OPERATOR, RISK_ANALYST
router.get('/', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR, ROLES.RISK_ANALYST, ROLES.VIEWER]), sanitizeQuery, ShipmentController.listShipments);

// Register a new shipment — restricted to operators and admins
router.post('/',
    authenticate,
    authorize([ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR]),
    validate('createShipment'),
    ShipmentController.createShipment
);

// Get a single shipment's full detail
// Requires: ORG_ADMIN, LOGISTICS_OPERATOR, RISK_ANALYST
router.get('/:shipmentId', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR, ROLES.RISK_ANALYST, ROLES.VIEWER]), validateObjectId('shipmentId'), ShipmentController.getShipment);

// Update shipment fields — restricted to operators and admins
router.put('/:shipmentId',
    authenticate,
    validateObjectId('shipmentId'),
    authorize([ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR]),
    validate('updateShipment'),
    ShipmentController.updateShipment
);

// Advance the shipment status through the workflow state machine
router.patch('/:shipmentId/status',
    authenticate,
    validateObjectId('shipmentId'),
    authorize([ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR]),
    validate('updateShipmentStatus'),
    ShipmentController.updateStatus
);

// Get the ordered tracking events timeline for the detail page
router.get('/:shipmentId/tracking', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR, ROLES.RISK_ANALYST, ROLES.VIEWER]), validateObjectId('shipmentId'), ShipmentController.getTrackingEvents);

export default router;
