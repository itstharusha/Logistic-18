import express from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticate, authorize, validateOrgId } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { ROLES } from '../config/rbac.constants.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Get current user profile
router.get('/me', UserController.getUser);

// List all users in organization (ORG_ADMIN only)
router.get('/', authorize([ROLES.ORG_ADMIN]), UserController.listUsers);

// Bulk operations (ORG_ADMIN only)
router.post('/bulk/assign-role', authorize([ROLES.ORG_ADMIN]), UserController.bulkAssignRole);
router.post('/bulk/deactivate', authorize([ROLES.ORG_ADMIN]), UserController.bulkDeactivateUsers);
router.post('/bulk/activate', authorize([ROLES.ORG_ADMIN]), UserController.bulkActivateUsers);

// Create user in organization (ORG_ADMIN only)
router.post('/create', authorize([ROLES.ORG_ADMIN]), validate('createUser'), UserController.createUser);

// Invite user to organization (ORG_ADMIN only)
router.post('/invite', authorize([ROLES.ORG_ADMIN]), validate('inviteUser'), UserController.inviteUser);

// Get specific user
router.get('/:userId', UserController.getUser);

// Update user profile
router.put('/:userId', validate('updateUser'), UserController.updateUser);

// Assign role to user (ORG_ADMIN only)
router.post('/:userId/assign-role', authorize([ROLES.ORG_ADMIN]), UserController.assignRole);

// Deactivate user (ORG_ADMIN only)
router.post('/:userId/deactivate', authorize([ROLES.ORG_ADMIN]), UserController.deactivateUser);

// Activate user (ORG_ADMIN only)
router.post('/:userId/activate', authorize([ROLES.ORG_ADMIN]), UserController.activateUser);

// Get user activity log (ORG_ADMIN only)
router.get('/:userId/activity-log', authorize([ROLES.ORG_ADMIN]), UserController.getUserActivityLog);

// Check email availability (public - for registration form)
router.get('/check-email/:email', UserController.checkEmailAvailability);

export default router;
