import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateObjectId, sanitizeQuery } from '../middleware/validation.js';
import { SupplierController } from '../controllers/SupplierController.js';

const router = express.Router();

// ==========================================
// SUPPLIER RISK MANAGEMENT MODULE (Rifshadh)
// ==========================================

// ── Static / collection-level routes (no :id param) ──────────────────────────

// GET  /api/suppliers         — list all suppliers (paginated, filterable)
router.get('/', authenticate, sanitizeQuery, SupplierController.listSuppliers);

// POST /api/suppliers         — register new supplier (ORG_ADMIN only)
router.post('/', authenticate, authorize(['ORG_ADMIN']), validate('createSupplier'), SupplierController.createSupplier);

// POST /api/suppliers/compare — registered before /:id to prevent param capture
router.post('/compare', authenticate, validate('compareSuppliers'), SupplierController.compareSuppliers);

// ── Nested /:id/* routes (specific) — must come before bare /:id ─────────────

// GET  /api/suppliers/:id/history
router.get('/:id/history', authenticate, validateObjectId('id'), SupplierController.getRiskHistory);

// POST /api/suppliers/:id/override-score
router.post('/:id/override-score', authenticate, validateObjectId('id'), authorize(['RISK_ANALYST', 'ORG_ADMIN']), validate('overrideSupplierScore'), SupplierController.overrideScore);

// POST /api/suppliers/:id/update-metrics
router.post('/:id/update-metrics', authenticate, validateObjectId('id'), authorize(['RISK_ANALYST', 'ORG_ADMIN']), validate('updateSupplierMetrics'), SupplierController.updateMetrics);

// PATCH /api/suppliers/:id/status
router.patch('/:id/status', authenticate, validateObjectId('id'), authorize(['ORG_ADMIN']), validate('updateSupplierStatus'), SupplierController.updateStatus);

// ── Generic /:id routes — registered last to avoid shadowing nested routes ────

// GET  /api/suppliers/:id     — get supplier detail
router.get('/:id', authenticate, validateObjectId('id'), SupplierController.getSupplier);

// PUT  /api/suppliers/:id     — update supplier profile + recompute risk score
router.put('/:id', authenticate, validateObjectId('id'), authorize(['ORG_ADMIN']), validate('updateSupplier'), SupplierController.updateSupplier);

export default router;
