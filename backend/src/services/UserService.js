import { UserRepository } from '../repositories/UserRepository.js';
import AuditLog from '../models/AuditLog.js';

export class UserService {
  // Get user profile
  static async getProfile(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Update user profile
  static async updateProfile(userId, orgId, updateData) {
    // If email is being updated, check for uniqueness
    if (updateData.email) {
      const existingUser = await UserRepository.findByEmail(updateData.email);
      if (existingUser && existingUser._id.toString() !== userId) {
        throw new Error('Email is already in use by another user');
      }
    }

    const user = await UserRepository.update(userId, updateData);
    if (!user) {
      throw new Error('User not found');
    }

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: userId,
      newValue: updateData,
    });

    return user;
  }

  // Get all users in organization
  static async listUsers(orgId, options = {}) {
    const users = await UserRepository.findByOrgId(orgId, options);
    const total = await UserRepository.countByOrgId(orgId);

    return {
      users,
      total,
      limit: options.limit,
      skip: options.skip,
    };
  }

  // Assign role to user (RBAC)
  static async assignRole(userId, orgId, newRole, assignedByUserId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    // Log audit
    await AuditLog.create({
      orgId,
      userId: assignedByUserId,
      action: 'ROLE_ASSIGNED',
      entityType: 'USER',
      entityId: userId,
      oldValue: { role: oldRole },
      newValue: { role: newRole },
    });

    return user;
  }

  // Deactivate user
  static async deactivateUser(userId, orgId, deactivatedByUserId) {
    const user = await UserRepository.deactivate(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Invalidate all tokens
    await UserRepository.invalidateRefreshTokens(userId);

    // Log audit
    await AuditLog.create({
      orgId,
      userId: deactivatedByUserId,
      action: 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: userId,
      newValue: { isActive: false },
    });

    return user;
  }

  // Activate user
  static async activateUser(userId, orgId, activatedByUserId) {
    const user = await UserRepository.activate(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Log audit
    await AuditLog.create({
      orgId,
      userId: activatedByUserId,
      action: 'USER_ACTIVATED',
      entityType: 'USER',
      entityId: userId,
      newValue: { isActive: true },
    });

    return user;
  }

  // Invite user (create with temporary password)
  static async inviteUser(userData, invitedByUserId) {
    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user with temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const user = await UserRepository.create({
      ...userData,
      passwordHash: temporaryPassword,
    });

    // Log audit
    await AuditLog.create({
      orgId: userData.orgId,
      userId: invitedByUserId,
      action: 'USER_INVITED',
      entityType: 'USER',
      entityId: user._id,
      newValue: { email: user.email, role: user.role },
    });

    // Return temporary password to be sent via email
    return {
      user,
      temporaryPassword,
      message: 'User invited successfully. Share temporary password securely.',
    };
  }

  // Check username availability (for future use)
  static async checkEmailAvailability(email) {
    const user = await UserRepository.findByEmail(email);
    return !user; // true if available, false if taken
  }

  // Get user activity log
  static async getUserActivityLog(userId, orgId, limit = 50) {
    return AuditLog.find({
      $or: [
        { userId },
        { entityId: userId },
      ],
      orgId,
    })
      .limit(limit)
      .sort({ timestamp: -1 });
  }

  // Generate temporary password
  static generateTemporaryPassword() {
    const length = 12;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
