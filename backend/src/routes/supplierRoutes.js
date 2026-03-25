import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { SupplierController } from '../controllers/SupplierController.js';

const router = express.Router();

// ==========================================
// SUPPLIER RISK MANAGEMENT MODULE (Rifshadh)
// ==========================================

// ── Static / collection-level routes (no :id param) ──────────────────────────

// GET  /api/suppliers         — list all suppliers (paginated, filterable)
router.get('/', authenticate, SupplierController.listSuppliers);

// POST /api/suppliers         — register new supplier (ORG_ADMIN only)
router.post('/', authenticate, authorize(['ORG_ADMIN']), SupplierController.createSupplier);

// POST /api/suppliers/compare — registered before /:id to prevent param capture
router.post('/compare', authenticate, SupplierController.compareSuppliers);

// ── Nested /:id/* routes (specific) — must come before bare /:id ─────────────

// GET  /api/suppliers/:id/history
router.get('/:id/history', authenticate, SupplierController.getRiskHistory);

// POST /api/suppliers/:id/override-score
router.post('/:id/override-score', authenticate, authorize(['RISK_ANALYST', 'ORG_ADMIN']), SupplierController.overrideScore);

// POST /api/suppliers/:id/update-metrics
router.post('/:id/update-metrics', authenticate, authorize(['RISK_ANALYST', 'ORG_ADMIN']), SupplierController.updateMetrics);

// PATCH /api/suppliers/:id/status
router.patch('/:id/status', authenticate, authorize(['ORG_ADMIN']), SupplierController.updateStatus);

// ── Generic /:id routes — registered last to avoid shadowing nested routes ────

// GET  /api/suppliers/:id     — get supplier detail
router.get('/:id', authenticate, SupplierController.getSupplier);

// PUT  /api/suppliers/:id     — update supplier profile + recompute risk score
router.put('/:id', authenticate, authorize(['ORG_ADMIN']), SupplierController.updateSupplier);

export default router;
