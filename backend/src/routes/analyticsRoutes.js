import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
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

// TEMP: fake authenticated user for local report testing only
router.post(
  '/generate',
  (req, res, next) => {
    req.user = {
      userId: '65f1a2b3c4d5e6f7890abc12',
      orgId: '65f1a2b3c4d5e6f7890abc34',
      role: 'ORG_ADMIN',
    };
    next();
  },
  analyticsController.generateReport
);

router.get(
  '/:reportId/download',
  (req, res, next) => {
    req.user = {
      userId: '65f1a2b3c4d5e6f7890abc12',
      orgId: '65f1a2b3c4d5e6f7890abc34',
      role: 'ORG_ADMIN',
    };
    next();
  },
  analyticsController.downloadReport
);

export default router;