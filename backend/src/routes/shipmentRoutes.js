/**
 * shipmentRoutes.js — Express Router for Shipment Management API
 *
 * Responsibility:
 *   Defines all HTTP routes for the shipment module and maps them to the
 *   appropriate ShipmentController handler, with authentication and RBAC middleware.
 *
 *   Base path: /api/shipments (mounted in app.js)
 *
 *   RBAC Summary:
 *   ┌────────────────────────────────────────┬──────────────────────────────────────────┐
 *   │ Route                                  │ Allowed Roles                            │
 *   ├────────────────────────────────────────┼──────────────────────────────────────────┤
 *   │ GET  /                                 │ All authenticated users                  │
 *   │ POST /                                 │ ORG_ADMIN, LOGISTICS_OPERATOR            │
 *   │ GET  /:shipmentId                      │ All authenticated users                  │
 *   │ PUT  /:shipmentId                      │ ORG_ADMIN, LOGISTICS_OPERATOR            │
 *   │ PATCH /:shipmentId/status              │ ORG_ADMIN, LOGISTICS_OPERATOR            │
 *   │ GET  /:shipmentId/tracking             │ All authenticated users                  │
 *   └────────────────────────────────────────┴──────────────────────────────────────────┘
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ShipmentController } from '../controllers/ShipmentController.js';

const router = express.Router();

// List all shipments for the org (all roles can view)
router.get('/', authenticate, ShipmentController.listShipments);

// Register a new shipment — restricted to operators and admins
router.post('/',
    authenticate,
    authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']),
    ShipmentController.createShipment
);

// Get a single shipment's full detail (all roles can view)
router.get('/:shipmentId', authenticate, ShipmentController.getShipment);

// Update shipment fields — restricted to operators and admins
router.put('/:shipmentId',
    authenticate,
    authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']),
    ShipmentController.updateShipment
);

// Advance the shipment status through the workflow state machine
router.patch('/:shipmentId/status',
    authenticate,
    authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']),
    ShipmentController.updateStatus
);

// Get the ordered tracking events timeline for the detail page
router.get('/:shipmentId/tracking', authenticate, ShipmentController.getTrackingEvents);

export default router;
