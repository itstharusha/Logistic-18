/**
 * UserRepository.js — Data Access Layer: users Collection
 *
 * Responsibility:
 *   Provides all MongoDB query operations for the User model.
 *   Sits between the service layer (UserService, AuthService) and the database,
 *   so business logic never writes raw Mongoose queries directly.
 *
 *   All methods are static — no instance creation needed.
 *   Methods that look up sensitive fields (passwordHash, refreshToken) must
 *   explicitly opt in with .select('+fieldName') since those fields are
 *   hidden by default in the User schema.
 */

import User from '../models/User.js';

export class UserRepository {

  /**
   * create
   * Inserts a new user document into the database.
   * The User model's pre-save hook automatically hashes the password
   * before the document is persisted.
   *
   * @param {object} userData - Fields matching the User schema
   * @returns {Promise<User>} The saved user document
   */
  static async create(userData) {
    const user = new User(userData);
    return user.save();
  }

  /**
   * findById
   * Fetches a single user by their MongoDB _id.
   * Sensitive fields (passwordHash, refreshToken) are excluded by default.
   *
   * @param {string} userId - MongoDB ObjectId string
   * @returns {Promise<User|null>}
   */
  static async findById(userId) {
    return User.findById(userId);
  }

  /**
   * findByEmail
   * Case-insensitive lookup by email address.
   * Used to check for duplicates before registration.
   *
   * @param {string} email - Email address to search for
   * @returns {Promise<User|null>}
   */
  static async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  /**
   * findByEmailWithPassword
   * Same as findByEmail but explicitly includes the passwordHash field.
   * Used ONLY during login so the password can be compared with bcrypt.
   *
   * @param {string} email
   * @returns {Promise<User|null>} User doc with passwordHash included
   */
  static async findByEmailWithPassword(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  }

  /**
   * findByOrgId
   * Returns all users belonging to a specific organisation.
   * Supports optional pagination (limit/skip), sorting, and field selection.
   *
   * @param {string} orgId   - Organisation's MongoDB ObjectId
   * @param {object} options - { limit, skip, sort, select }
   * @returns {Promise<User[]>}
   */
  static async findByOrgId(orgId, options = {}) {
    const query = User.find({ orgId });

    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);
    if (options.sort) query.sort(options.sort);
    if (options.select) query.select(options.select);

    return query.exec();
  }

  /**
   * countByOrgId
   * Returns the total number of users in an organisation.
   * Used for pagination metadata in user list responses.
   *
   * @param {string} orgId
   * @returns {Promise<number>}
   */
  static async countByOrgId(orgId) {
    return User.countDocuments({ orgId });
  }

  /**
   * findAll
   * Returns all users across all organisations.
   * Supports optional pagination (limit/skip), sorting, and field selection.
   *
   * @param {object} options - { limit, skip, sort, select }
   * @returns {Promise<User[]>}
   */
  static async findAll(options = {}) {
    const query = User.find();

    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);
    if (options.sort) query.sort(options.sort);
    if (options.select) query.select(options.select);

    return query.exec();
  }

  /**
   * countAll
   * Returns the total number of users across all organisations.
   *
   * @returns {Promise<number>}
   */
  static async countAll() {
    return User.countDocuments();
  }

  /**
   * update
   * Updates one or more fields on a user document.
   * Returns the document AFTER the update (new: true).
   * Runs schema validators on the updated fields.
   *
   * @param {string} userId     - Target user's MongoDB ObjectId
   * @param {object} updateData - Fields to update
   * @returns {Promise<User|null>}
   */
  static async update(userId, updateData) {
    return User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
  }

  /**
   * updateRefreshToken
   * Stores a new refresh token and increments the version counter.
   * Called after every successful login or token rotation.
   *
   * @param {string} userId     - Target user's MongoDB ObjectId
   * @param {string} newToken   - The new JWT refresh token string
   * @param {number} newVersion - Incremented version for reuse detection
   * @returns {Promise<User|null>}
   */
  static async updateRefreshToken(userId, newToken, newVersion) {
    return User.findByIdAndUpdate(
      userId,
      { refreshToken: newToken, refreshTokenVersion: newVersion },
      { new: true }
    );
  }

  /**
   * invalidateRefreshTokens
   * Clears the stored refresh token and increments the version.
   * All previously issued refresh tokens for this user become invalid.
   * Called on logout, password change, and token reuse detection.
   *
   * @param {string} userId
   * @returns {Promise<User|null>}
   */
  static async invalidateRefreshTokens(userId) {
    if (!userId) return null;

    // Need to select +refreshTokenVersion because it's hidden by default
    const user = await User.findById(userId).select('+refreshTokenVersion');
    if (!user) return null;

    user.refreshToken = null;
    user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
    return user.save();
  }

  /**
   * deactivate
   * Soft-deletes a user by setting isActive = false.
   * The user's data is preserved; they simply cannot log in until reactivated.
   *
   * @param {string} userId
   * @returns {Promise<User|null>}
   */
  static async deactivate(userId) {
    return User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
  }

  /**
   * activate
   * Re-enables a deactivated user account.
   *
   * @param {string} userId
   * @returns {Promise<User|null>}
   */
  static async activate(userId) {
    return User.findByIdAndUpdate(userId, { isActive: true }, { new: true });
  }

  /**
   * updateLastLogin
   * Records the timestamp and IP address of the user's most recent login.
   * Used for security monitoring and displaying "last seen" in admin views.
   *
   * @param {string} userId    - Target user's MongoDB ObjectId
   * @param {string} ipAddress - Client IP from req.ip
   * @returns {Promise<User|null>}
   */
  static async updateLastLogin(userId, ipAddress) {
    return User.findByIdAndUpdate(
      userId,
      { lastLoginAt: new Date(), lastLoginIp: ipAddress },
      { new: true }
    );
  }

  /**
   * findActiveByRole
   * Returns all active users with a specific role in an organisation.
   * Used by the alert engine to find analysts available for assignment.
   *
   * @param {string} orgId - Organisation's MongoDB ObjectId
   * @param {string} role  - RBAC role string (e.g. 'RISK_ANALYST')
   * @returns {Promise<User[]>}
   */
  static async findActiveByRole(orgId, role) {
    return User.find({ role, isActive: true });
  }

  /**
   * permanentlyDelete
   * Hard-deletes a user document from the database.
   * Use with extreme caution — prefer deactivate() for most cases.
   *
   * @param {string} userId
   * @returns {Promise<User|null>}
   */
  static async permanentlyDelete(userId) {
    return User.findByIdAndRemove(userId);
  }
}
