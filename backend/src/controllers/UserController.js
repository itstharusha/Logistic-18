import { UserService } from '../services/UserService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class UserController {
  // GET /api/users/:userId
  static getUser = asyncHandler(async (req, res) => {
    const user = await UserService.getProfile(req.params.userId);
    res.json({ user });
  });

  // PUT /api/users/:userId
  static updateUser = asyncHandler(async (req, res) => {
    const user = await UserService.updateProfile(
      req.params.userId,
      req.user.orgId,
      req.validatedBody
    );
    res.json({
      message: 'User updated successfully',
      user,
    });
  });

  // GET /api/users
  static listUsers = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const result = await UserService.listUsers(req.user.orgId, {
      limit,
      skip,
      sort: { createdAt: -1 },
    });

    res.json(result);
  });

  // POST /api/users/:userId/assign-role
  static assignRole = asyncHandler(async (req, res) => {
    const { role } = req.body;

    if (!['VIEWER', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'RISK_ANALYST', 'ORG_ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await UserService.assignRole(
      req.params.userId,
      req.user.orgId,
      role,
      req.user.userId
    );

    res.json({
      message: 'Role assigned successfully',
      user,
    });
  });

  // POST /api/users/:userId/deactivate
  static deactivateUser = asyncHandler(async (req, res) => {
    const user = await UserService.deactivateUser(
      req.params.userId,
      req.user.orgId,
      req.user.userId
    );

    res.json({
      message: 'User deactivated successfully',
      user,
    });
  });

  // POST /api/users/:userId/activate
  static activateUser = asyncHandler(async (req, res) => {
    const user = await UserService.activateUser(
      req.params.userId,
      req.user.orgId,
      req.user.userId
    );

    res.json({
      message: 'User activated successfully',
      user,
    });
  });

  // POST /api/users/bulk/assign-role
  static bulkAssignRole = asyncHandler(async (req, res) => {
    const { userIds, role } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }
    const results = await UserService.bulkAssignRole(userIds, req.user.orgId, role, req.user.userId);
    res.json({ message: 'Bulk assign role completed', results });
  });

  // POST /api/users/bulk/deactivate
  static bulkDeactivateUsers = asyncHandler(async (req, res) => {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }
    const results = await UserService.bulkDeactivateUsers(userIds, req.user.orgId, req.user.userId);
    res.json({ message: 'Bulk deactivate completed', results });
  });

  // POST /api/users/bulk/activate
  static bulkActivateUsers = asyncHandler(async (req, res) => {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }
    const results = await UserService.bulkActivateUsers(userIds, req.user.orgId, req.user.userId);
    res.json({ message: 'Bulk activate completed', results });
  });

  // POST /api/users/create
  static createUser = asyncHandler(async (req, res) => {
    const { name, email, role, password } = req.body;

    const result = await UserService.createUser(
      {
        name,
        email,
        role: role || 'VIEWER',
        password,
        orgId: req.user.orgId,
      },
      req.user.userId
    );

    res.status(201).json({
      message: 'User created successfully',
      user: result.user,
      note: 'User account is ready to use',
    });
  });

  // POST /api/users/invite
  static inviteUser = asyncHandler(async (req, res) => {
    const { name, email, role } = req.body;

    const result = await UserService.inviteUser(
      {
        name,
        email,
        role: role || 'VIEWER',
        orgId: req.user.orgId,
      },
      req.user.userId
    );

    res.status(201).json({
      message: 'User invited successfully',
      user: result.user,
      temporaryPassword: result.temporaryPassword,
      note: 'Share the temporary password securely. User should change password on first login.',
    });
  });

  // GET /api/users/:userId/activity-log
  static getUserActivityLog = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;

    const logs = await UserService.getUserActivityLog(
      req.params.userId,
      req.user.orgId,
      limit
    );

    res.json({ logs });
  });

  // GET /api/users/check-email-availability/:email
  static checkEmailAvailability = asyncHandler(async (req, res) => {
    const isAvailable = await UserService.checkEmailAvailability(req.params.email);

    res.json({
      email: req.params.email,
      available: isAvailable,
    });
  });
}
