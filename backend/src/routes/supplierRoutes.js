/**
 * supplierRoutes.js — Express Router for Supplier Risk Management API
 *
 * Responsibility:
 *   Defines all HTTP routes for the supplier module and maps them to the
 *   appropriate SupplierController handler, with authentication and RBAC middleware.
 *
 *   Base path: /api/suppliers (mounted in app.js)
 *
 *   RBAC Summary:
 *   ┌──────────────────────────────────┬──────────────────────────────────────┐
 *   │ Route                            │ Allowed Roles                        │
 *   ├──────────────────────────────────┼──────────────────────────────────────┤
 *   │ GET  /                           │ All authenticated users              │
 *   │ POST /                           │ ORG_ADMIN only                       │
 *   │ POST /compare                    │ All authenticated users              │
 *   │ GET  /:id                        │ All authenticated users              │
 *   │ PUT  /:id                        │ ORG_ADMIN only                       │
 *   │ GET  /:id/history                │ All authenticated users              │
 *   │ POST /:id/override-score         │ RISK_ANALYST, ORG_ADMIN              │
 *   │ POST /:id/update-metrics         │ RISK_ANALYST, ORG_ADMIN              │
 *   │ PATCH /:id/status                │ ORG_ADMIN only                       │
 *   └──────────────────────────────────┴──────────────────────────────────────┘
 *
 *   Route ordering is important:
 *   - /compare must be registered BEFORE /:id to prevent Express from treating
 *     the literal string "compare" as a dynamic :id parameter.
 *   - Nested /:id/* routes (/:id/history etc.) are registered BEFORE the bare /:id route
 *     for the same reason.
 *
 *   Module owner: Rifshadh (Supplier Risk Module)
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { SupplierController } from '../controllers/SupplierController.js';

const router = express.Router();

// ── Static / Collection-Level Routes ─────────────────────────────────────────

// List all suppliers for the org — supports search, status, tier, pagination
router.get('/', authenticate, SupplierController.listSuppliers);

// Register a new supplier — restricted to ORG_ADMIN
router.post('/', authenticate, authorize(['ORG_ADMIN']), SupplierController.createSupplier);

// Compare multiple suppliers side-by-side — registered before /:id to prevent param capture
router.post('/compare', authenticate, SupplierController.compareSuppliers);

// ── Nested /:id/* Routes (specific) — must come before bare /:id ─────────────

// Get the risk score history timeline for the chart
router.get('/:id/history', authenticate, SupplierController.getRiskHistory);

// Manually override the supplier's risk score (analyst action with justification)
router.post('/:id/override-score',
    authenticate,
    authorize(['RISK_ANALYST', 'ORG_ADMIN']),
    SupplierController.overrideScore
);

// Adjust performance metrics and trigger risk score recalculation
router.post('/:id/update-metrics',
    authenticate,
    authorize(['RISK_ANALYST', 'ORG_ADMIN']),
    SupplierController.updateMetrics
);

// Change the supplier's operational status (active/under_watch/high_risk/suspended)
router.patch('/:id/status',
    authenticate,
    authorize(['ORG_ADMIN']),
    SupplierController.updateStatus
);

// ── Generic /:id Routes — registered last to avoid shadowing nested routes ────

// Get a supplier's full profile (including riskHistory, overrideHistory, etc.)
router.get('/:id', authenticate, SupplierController.getSupplier);

// Update supplier profile fields — triggers risk score recalculation
router.put('/:id', authenticate, authorize(['ORG_ADMIN']), SupplierController.updateSupplier);

export default router;
