import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateObjectId, sanitizeQuery } from '../middleware/validation.js';
import { AlertController } from '../controllers/AlertController.js';
import { ROLES } from '../config/rbac.constants.js';

const router = express.Router();

// ==========================================
// ALERTS & NOTIFICATIONS MODULE (Kulatunga)
// ==========================================

// Dashboard stats — accessible by ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR, INVENTORY_MANAGER
router.get('/dashboard', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER]), AlertController.getDashboard);

// My alerts — alerts assigned to current user
// Accessible by: ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR, INVENTORY_MANAGER
router.get('/my', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER]), sanitizeQuery, AlertController.getMyAlerts);

// Alert history — resolved alerts
// Accessible by: ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR, INVENTORY_MANAGER
router.get('/history/all', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER]), sanitizeQuery, AlertController.getHistory);

// Escalate overdue alerts (internal/cron — admin only)
router.post(
  '/escalate',
  authenticate,
  authorize([ROLES.ORG_ADMIN]),
  AlertController.escalateAlerts
);

// List all alerts with filters
// Accessible by: ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR, INVENTORY_MANAGER
router.get('/', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER]), sanitizeQuery, AlertController.listAlerts);

// Create a new alert (admin, risk analyst, or system)
router.post(
  '/',
  authenticate,
  authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST]),
  validate('createAlert'),
  AlertController.createAlert
);

// Get single alert detail
// Accessible by: ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR, INVENTORY_MANAGER
router.get('/:alertId', authenticate, authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER]), validateObjectId('alertId'), AlertController.getAlertDetail);

// Acknowledge alert (one-click)
router.post(
  '/:alertId/acknowledge',
  authenticate,
  validateObjectId('alertId'),
  authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER]),
  AlertController.acknowledgeAlert
);

// Resolve alert with resolution note
router.post(
  '/:alertId/resolve',
  authenticate,
  validateObjectId('alertId'),
  authorize([ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER]),
  validate('resolveAlert'),
  AlertController.resolveAlert
);

export default router;
