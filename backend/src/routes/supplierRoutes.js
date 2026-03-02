import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { SupplierController } from '../controllers/SupplierController.js';

const router = express.Router();

// ==========================================
// SUPPLIER RISK MANAGEMENT MODULE (Rifshadh)
// ==========================================

// POST /compare must be registered before /:id to avoid route collision
router.post('/compare', authenticate, SupplierController.compareSuppliers);

// GET  /api/suppliers       — list all suppliers (paginated, filterable)
router.get('/', authenticate, SupplierController.listSuppliers);

// POST /api/suppliers       — register new supplier (ORG_ADMIN only)
router.post('/', authenticate, authorize(['ORG_ADMIN']), SupplierController.createSupplier);

// GET  /api/suppliers/:id   — get supplier detail
router.get('/:id', authenticate, SupplierController.getSupplier);

// PUT  /api/suppliers/:id   — update supplier profile + recompute risk score
router.put('/:id', authenticate, authorize(['ORG_ADMIN']), SupplierController.updateSupplier);

// GET  /api/suppliers/:id/history      — risk score history snapshots
router.get('/:id/history', authenticate, SupplierController.getRiskHistory);

// POST /api/suppliers/:id/override-score — manual risk override (RISK_ANALYST, ORG_ADMIN)
router.post('/:id/override-score', authenticate, authorize(['RISK_ANALYST', 'ORG_ADMIN']), SupplierController.overrideScore);

// PATCH /api/suppliers/:id/status      — update operational status (ORG_ADMIN only)
router.patch('/:id/status', authenticate, authorize(['ORG_ADMIN']), SupplierController.updateStatus);

export default router;
