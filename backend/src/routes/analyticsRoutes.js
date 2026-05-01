import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

// ==========================================
// ANALYTICS & REPORTS MODULE (Senadeera)
// ==========================================

router.get('/kpi', authenticate, analyticsController.getKpiDrilldown);
router.get('/dashboard', authenticate, analyticsController.getDashboard);
router.get('/suppliers/performance', authenticate, analyticsController.getSupplierPerformance);
router.get('/shipments/delays', authenticate, analyticsController.getShipmentDelays);
router.get('/inventory/risk', authenticate, analyticsController.getInventoryRisk);
router.get('/alerts/summary', authenticate, analyticsController.getAlertSummary);

router.post('/generate', authenticate, validate('generateReport'), analyticsController.generateReport);

router.get('/:reportId/download', authenticate, analyticsController.downloadReport);

export default router;