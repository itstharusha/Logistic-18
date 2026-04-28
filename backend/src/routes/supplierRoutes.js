import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateObjectId, sanitizeQuery } from '../middleware/validation.js';
import { SupplierController } from '../controllers/SupplierController.js';
import { ROLES } from '../config/rbac.constants.js';

const router = express.Router();

// ==========================================
// SUPPLIER RISK MANAGEMENT MODULE (Rifshadh)
// ==========================================

// ── Static / collection-level routes (no :id param) ──────────────────────────

// GET  /api/suppliers         — list all suppliers (paginated, filterable)
// Requires: ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR
router.get('/', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER]), sanitizeQuery, SupplierController.listSuppliers);

// POST /api/suppliers         — register new supplier (ORG_ADMIN only)
router.post('/', authenticate, authorize([ROLES.ORG_ADMIN]), validate('createSupplier'), SupplierController.createSupplier);

// POST /api/suppliers/compare — registered before /:id to prevent param capture
// Requires: ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR
router.post('/compare', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER]), validate('compareSuppliers'), SupplierController.compareSuppliers);

// ── Nested /:id/* routes (specific) — must come before bare /:id ─────────────

// GET  /api/suppliers/:id/history
// Requires: ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR
router.get('/:id/history', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER]), validateObjectId('id'), SupplierController.getRiskHistory);

// POST /api/suppliers/:id/override-score
router.post('/:id/override-score', authenticate, validateObjectId('id'), authorize([ROLES.RISK_ANALYST, ROLES.ORG_ADMIN]), validate('overrideSupplierScore'), SupplierController.overrideScore);

// POST /api/suppliers/:id/update-metrics
router.post('/:id/update-metrics', authenticate, validateObjectId('id'), authorize([ROLES.RISK_ANALYST, ROLES.ORG_ADMIN]), validate('updateSupplierMetrics'), SupplierController.updateMetrics);

// PATCH /api/suppliers/:id/status
router.patch('/:id/status', authenticate, validateObjectId('id'), authorize([ROLES.ORG_ADMIN]), validate('updateSupplierStatus'), SupplierController.updateStatus);

// ── Generic /:id routes — registered last to avoid shadowing nested routes ────

// GET  /api/suppliers/:id     — get supplier detail
// Requires: ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR
router.get('/:id', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER]), validateObjectId('id'), SupplierController.getSupplier);

// PUT  /api/suppliers/:id     — update supplier profile + recompute risk score
router.put('/:id', authenticate, validateObjectId('id'), authorize([ROLES.ORG_ADMIN]), validate('updateSupplier'), SupplierController.updateSupplier);

export default router;
