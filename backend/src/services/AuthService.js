import { UserRepository } from '../repositories/UserRepository.js';
import AuditLog from '../models/AuditLog.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';
import { AuthenticationError, ConflictError } from '../utils/errors.js';

export class AuthService {
  // User registration
  static async register(userData) {
    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create new user
    const user = await UserRepository.create({
      ...userData,
      passwordHash: userData.password, // Will be hashed by User model's pre-save hook
    });

    // Log audit
    await AuditLog.create({
      orgId: user.orgId,
      userId: user._id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: user._id,
      newValue: { email: user.email, role: user.role },
    });

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };
  }

  // User login
  static async login(email, password, ipAddress) {
    const user = await UserRepository.findByEmailWithPassword(email);

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await UserRepository.updateLastLogin(user._id, ipAddress);

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.orgId, user.role);
    const refreshToken = generateRefreshToken(user._id, user.orgId, user.refreshTokenVersion || 0);

    // Save refresh token
    await UserRepository.updateRefreshToken(user._id, refreshToken, user.refreshTokenVersion || 0);

    // Log audit
    await AuditLog.create({
      orgId: user.orgId,
      userId: user._id,
      action: 'LOGIN',
      ipAddress,
      entityType: 'USER',
      entityId: user._id,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
    };
  }

  // Refresh access token
  static async refreshAccessToken(refreshToken, userId, orgId, ipAddress) {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      if (decoded.userId !== userId.toString()) {
        throw new Error('Token does not belong to this user');
      }

      // Get user and check token version (detect reuse)
      const user = await UserRepository.findById(userId).select('+refreshTokenVersion');
      if (decoded.version !== user.refreshTokenVersion) {
        // Token reuse detected - invalidate all tokens
        await UserRepository.invalidateRefreshTokens(userId);
        throw new Error('Token reuse detected - unauthorized');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(userId, orgId, user.role);
      const newRefreshToken = generateRefreshToken(userId, orgId, user.refreshTokenVersion + 1);

      // Save new refresh token (rotation)
      await UserRepository.updateRefreshToken(userId, newRefreshToken, user.refreshTokenVersion + 1);

      // Log audit
      await AuditLog.create({
        orgId,
        userId,
        action: 'TOKEN_REFRESHED',
        ipAddress,
        entityType: 'AUTH',
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Logout
  static async logout(userId, orgId, ipAddress) {
    // Invalidate refresh token
    await UserRepository.invalidateRefreshTokens(userId);

    // Log audit
    await AuditLog.create({
      orgId,
      userId,
      action: 'LOGOUT',
      ipAddress,
      entityType: 'AUTH',
      entityId: userId,
    });
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await UserRepository.findById(userId).select('+passwordHash');

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    // Invalidate all refresh tokens (force re-login)
    await UserRepository.invalidateRefreshTokens(userId);

    // Log audit
    await AuditLog.create({
      orgId: user.orgId,
      userId: user._id,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: user._id,
    });

    return { message: 'Password changed successfully' };
  }
}
