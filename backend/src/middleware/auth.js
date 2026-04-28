/**
 * auth.js — Authentication & Authorisation Middleware
 *
 * Responsibility:
 *   Provides all JWT-related utility functions and Express middleware used to
 *   protect routes and enforce role-based access control (RBAC).
 *
 *   Exports:
 *   - verifyAccessToken        : Decodes and verifies a JWT access token.
 *   - verifyRefreshToken       : Decodes and verifies a JWT refresh token.
 *   - generateAccessToken      : Creates a new 15-minute access token.
 *   - generateRefreshToken     : Creates a new 7-day refresh token with a version number.
 *   - authenticate             : Express middleware — validates the Bearer token in the
 *                                Authorization header and attaches req.user.
 *   - authorize(roles)         : Express middleware factory — checks req.user.role against
 *                                an allowed list and blocks access if not permitted.
 *   - validateOrgId            : Prevents cross-tenant data access by comparing orgIds.
 *   - preventPrivilegeEscalation: Blocks non-admin users from assigning roles.
 *   - checkRefreshTokenRotation : Detects refresh token reuse (potential theft).
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { ROLES, isValidRole } from '../config/rbac.constants.js';

// ─────────────────────────────────────────────
// JWT Utility Functions
// ─────────────────────────────────────────────

/**
 * verifyAccessToken
 * Decodes and verifies the signature of a JWT access token.
 * Throws an Error if the token is invalid or expired.
 *
 * @param {string} token - The raw JWT string (without "Bearer " prefix)
 * @returns {object} The decoded token payload (userId, orgId, role)
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * verifyRefreshToken
 * Decodes and verifies the signature of a JWT refresh token.
 * Throws an Error if the token is invalid or expired.
 *
 * @param {string} token - The raw JWT refresh token string
 * @returns {object} The decoded payload (userId, orgId, version)
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error(`Refresh token verification failed: ${error.message}`);
  }
};

/**
 * generateAccessToken
 * Creates a short-lived JWT access token (default: 15 minutes).
 * Payload contains the minimum data needed to identify and authorise requests.
 *
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {string} orgId  - MongoDB ObjectId of the user's organisation
 * @param {string} role   - User's RBAC role (e.g. 'ORG_ADMIN')
 * @returns {string} Signed JWT string
 */
export const generateAccessToken = (userId, orgId, role) => {
  return jwt.sign(
    { userId, orgId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * generateRefreshToken
 * Creates a long-lived JWT refresh token (default: 7 days).
 * Includes a version number to support token rotation and reuse detection.
 * When a refresh token is used, its version is incremented in the database,
 * invalidating any previously issued token with the same version.
 *
 * @param {string} userId  - MongoDB ObjectId of the user
 * @param {string} orgId   - MongoDB ObjectId of the user's organisation
 * @param {number} version - Current token version from the user's record
 * @returns {string} Signed JWT refresh token
 */
export const generateRefreshToken = (userId, orgId, version) => {
  return jwt.sign(
    { userId, orgId, version },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

// ─────────────────────────────────────────────
// Express Middleware
// ─────────────────────────────────────────────

/**
 * authenticate
 * Express middleware that validates the JWT access token from the
 * Authorization header and populates req.user with the decoded payload.
 *
 * Expected header: Authorization: Bearer <accessToken>
 *
 * On success: sets req.user = { userId, orgId, role } and calls next()
 * On failure: returns 401 Unauthorized
 *
 * SECURITY: Also verifies that:
 * - The user account is still active (not deactivated)
 * - The role is still valid
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Reject requests without a Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    // Strip the "Bearer " prefix to get the raw token
    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);
      
      // ✅ NEW SECURITY CHECK: Verify user is still active in database
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User account not found' });
      }
      if (!user.isActive) {
        return res.status(401).json({ error: 'User account is inactive or has been deactivated' });
      }
      
      // ✅ NEW SECURITY CHECK: Verify role is still valid
      if (!isValidRole(decoded.role)) {
        return res.status(401).json({ error: 'User role is invalid' });
      }
      
      // Attach the decoded user identity to the request for use in controllers
      req.user = {
        userId: decoded.userId,
        orgId: decoded.orgId,
        role: decoded.role,
      };
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication error', details: error.message });
  }
};

/**
 * authorize(allowedRoles)
 * Express middleware factory for Role-Based Access Control (RBAC).
 * Returns a middleware that checks whether req.user.role is in the allowedRoles list.
 *
 * Usage: router.post('/admin-action', authenticate, authorize(['ORG_ADMIN']), handler)
 *
 * @param {string[]} allowedRoles - Array of roles permitted to access this route
 * @returns Express middleware function
 */
export const authorize = (allowedRoles) => {
  return (req, res, next) => {
    // authenticate must run first to populate req.user
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log the unauthorised access attempt to the audit trail for security review
      AuditLog.create({
        orgId: req.user.orgId,
        userId: req.user.userId,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entityType: 'AUTHORIZATION',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }).catch(err => console.error('Audit log error:', err));

      return res.status(403).json({
        error: 'Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next(); // User has the required role — continue to the route handler
  };
};

/**
 * validateOrgId
 * Multi-tenant isolation middleware that prevents users from accessing data
 * belonging to a different organisation by comparing the orgId in the
 * request (params or body) with the orgId in the JWT token.
 */
export const validateOrgId = (req, res, next) => {
  const requestedOrgId = req.params.orgId || req.body.orgId;

  if (requestedOrgId && requestedOrgId !== req.user.orgId.toString()) {
    // Log cross-tenant access attempt as a security incident
    AuditLog.create({
      orgId: req.user.orgId,
      userId: req.user.userId,
      action: 'CROSS_TENANT_ACCESS_ATTEMPT',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }).catch(err => console.error('Audit log error:', err));

    return res.status(403).json({ error: 'Cross-tenant access not permitted' });
  }

  next();
};

/**
 * preventPrivilegeEscalation
 * Blocks non-admin users from assigning or modifying roles.
 * Prevents a lower-privileged user from gaining elevated access via API manipulation.
 */
export const preventPrivilegeEscalation = async (req, res, next) => {
  // Only ORG_ADMIN can include a 'role' field in the request body
  if (req.body.role && req.user.role !== ROLES.ORG_ADMIN) {
    return res.status(403).json({ error: 'Only org admins can assign roles' });
  }

  next();
};

/**
 * checkRefreshTokenRotation
 * Detects refresh token reuse — a sign of potential token theft.
 * Compares the version embedded in the stored DB token with the
 * version in the user document. A mismatch means a previously
 * consumed token is being presented again.
 *
 * On reuse detected: invalidates ALL tokens for the user and returns 401.
 */
export const checkRefreshTokenRotation = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('+refreshTokenVersion +refreshToken');

    if (!user || !user.refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    // Decode the token stored in the database to check its version
    const decoded = verifyRefreshToken(user.refreshToken);
    if (decoded.version !== user.refreshTokenVersion) {
      // Version mismatch = a previously rotated (invalidated) token was reused
      user.refreshToken = null;
      user.refreshTokenVersion += 1;
      await user.save();

      // Log the security incident
      await AuditLog.create({
        orgId: user.orgId,
        userId: user._id,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(401).json({ error: 'Token reuse detected - please login again' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Token validation error', details: error.message });
  }
};
