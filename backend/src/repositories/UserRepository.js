import User from '../models/User.js';

export class UserRepository {
  // Create a new user
  static async create(userData) {
    const user = new User(userData);
    return user.save();
  }

  // Find user by ID
  static async findById(userId) {
    return User.findById(userId);
  }

  // Find user by email
  static async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  // Find user by email with password (for login)
  static async findByEmailWithPassword(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  }

  // Find all users in organization
  static async findByOrgId(orgId, options = {}) {
    const query = User.find({ orgId });
    
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);
    if (options.sort) query.sort(options.sort);
    if (options.select) query.select(options.select);

    return query.exec();
  }

  // Count users in organization
  static async countByOrgId(orgId) {
    return User.countDocuments({ orgId });
  }

  // Update user
  static async update(userId, updateData) {
    return User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
  }

  // Update refresh token and version
  static async updateRefreshToken(userId, newToken, newVersion) {
    return User.findByIdAndUpdate(
      userId,
      { refreshToken: newToken, refreshTokenVersion: newVersion },
      { new: true }
    );
  }

  // Invalidate all refresh tokens (on rotation or breach detection)
  static async invalidateRefreshTokens(userId) {
    return User.findByIdAndUpdate(
      userId,
      { 
        refreshToken: null,
        refreshTokenVersion: (await User.findById(userId)).refreshTokenVersion + 1 
      },
      { new: true }
    );
  }

  // Soft delete user (deactivate)
  static async deactivate(userId) {
    return User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );
  }

  // Activate user
  static async activate(userId) {
    return User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    );
  }

  // Update last login info
  static async updateLastLogin(userId, ipAddress) {
    return User.findByIdAndUpdate(
      userId,
      {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
      { new: true }
    );
  }

  // Find active users by role in organization
  static async findActiveByRole(orgId, role) {
    return User.find({
      orgId,
      role,
      isActive: true,
    });
  }

  // Delete user permanently (hard delete)
  static async permanentlyDelete(userId) {
    return User.findByIdAndRemove(userId);
  }
}
