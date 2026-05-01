import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateObjectId, sanitizeQuery } from '../middleware/validation.js';
import { AlertController } from '../controllers/AlertController.js';

const router = express.Router();

// ==========================================
// ALERTS & NOTIFICATIONS MODULE (Kulatunga)
// ==========================================

// Dashboard stats — accessible by all authenticated users
router.get('/dashboard', authenticate, AlertController.getDashboard);

// My alerts — alerts assigned to current user
router.get('/my', authenticate, sanitizeQuery, AlertController.getMyAlerts);

// Alert history — resolved alerts
router.get('/history/all', authenticate, sanitizeQuery, AlertController.getHistory);

// Escalate overdue alerts (internal/cron — admin only)
router.post(
  '/escalate',
  authenticate,
  authorize(['ORG_ADMIN']),
  AlertController.escalateAlerts
);

// List all alerts with filters
router.get('/', authenticate, sanitizeQuery, AlertController.listAlerts);

// Create a new alert (admin, risk analyst, or system)
router.post(
  '/',
  authenticate,
  authorize(['ORG_ADMIN', 'RISK_ANALYST']),
  validate('createAlert'),
  AlertController.createAlert
);

// Get single alert detail
router.get('/:alertId', authenticate, validateObjectId('alertId'), AlertController.getAlertDetail);

// Acknowledge alert (one-click)
router.post(
  '/:alertId/acknowledge',
  authenticate,
  validateObjectId('alertId'),
  authorize(['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER']),
  AlertController.acknowledgeAlert
);

// Resolve alert with resolution note
router.post(
  '/:alertId/resolve',
  authenticate,
  validateObjectId('alertId'),
  authorize(['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER']),
  validate('resolveAlert'),
  AlertController.resolveAlert
);

export default router;
