import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as analyticsController from '../controllers/analyticsController.js';
import { ROLES } from '../config/rbac.constants.js';

const router = express.Router();

// ==========================================
// ANALYTICS & REPORTS MODULE (Senadeera)
// ==========================================

// Analytics requires: ORG_ADMIN, RISK_ANALYST, VIEWER
const analyticsRoles = [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.VIEWER];

router.get('/kpi', authenticate, authorize(analyticsRoles), analyticsController.getKpiDrilldown);
router.get('/dashboard', authenticate, authorize(analyticsRoles), analyticsController.getDashboard);
router.get('/suppliers/performance', authenticate, authorize(analyticsRoles), analyticsController.getSupplierPerformance);
router.get('/shipments/delays', authenticate, authorize(analyticsRoles), analyticsController.getShipmentDelays);
router.get('/inventory/risk', authenticate, authorize(analyticsRoles), analyticsController.getInventoryRisk);
router.get('/alerts/summary', authenticate, authorize(analyticsRoles), analyticsController.getAlertSummary);

// Report generation requires: ORG_ADMIN, RISK_ANALYST only
router.post('/generate', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST]), validate('generateReport'), analyticsController.generateReport);

router.get('/:reportId/download', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST]), analyticsController.downloadReport);

export default router;