import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { AlertController } from '../controllers/AlertController.js';

const router = express.Router();

// ==========================================
// ALERTS & NOTIFICATIONS MODULE (Kulatunga)
// ==========================================

// Dashboard stats — accessible by all authenticated users
router.get('/dashboard', authenticate, AlertController.getDashboard);

// My alerts — alerts assigned to current user
router.get('/my', authenticate, AlertController.getMyAlerts);

// Alert history — resolved alerts
router.get('/history/all', authenticate, AlertController.getHistory);

// Escalate overdue alerts (internal/cron — admin only)
router.post(
  '/escalate',
  authenticate,
  authorize(['ORG_ADMIN']),
  AlertController.escalateAlerts
);

// List all alerts with filters
router.get('/', authenticate, AlertController.listAlerts);

// Create a new alert (admin, risk analyst, or system)
router.post(
  '/',
  authenticate,
  authorize(['ORG_ADMIN', 'RISK_ANALYST']),
  AlertController.createAlert
);

// Get single alert detail
router.get('/:alertId', authenticate, AlertController.getAlertDetail);

// Acknowledge alert (one-click)
router.post(
  '/:alertId/acknowledge',
  authenticate,
  authorize(['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER']),
  AlertController.acknowledgeAlert
);

// Resolve alert with resolution note
router.post(
  '/:alertId/resolve',
  authenticate,
  authorize(['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER']),
  AlertController.resolveAlert
);

export default router;
