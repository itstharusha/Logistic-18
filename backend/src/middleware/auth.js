import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

// Verify JWT Access Token
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

// Verify JWT Refresh Token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error(`Refresh token verification failed: ${error.message}`);
  }
};

// Generate Access Token
export const generateAccessToken = (userId, orgId, role) => {
  return jwt.sign(
    { userId, orgId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

// Generate Refresh Token
export const generateRefreshToken = (userId, orgId, version) => {
  return jwt.sign(
    { userId, orgId, version },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

// JWT Authentication Middleware
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);
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

// RBAC Middleware - Check if user has required role(s)
export const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log unauthorized access attempt
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
        userRole: req.user.role
      });
    }

    next();
  };
};

// Validate orgId matches (multi-tenant isolation)
export const validateOrgId = (req, res, next) => {
  const requestedOrgId = req.params.orgId || req.body.orgId;
  
  if (requestedOrgId && requestedOrgId !== req.user.orgId.toString()) {
    // Log unauthorized cross-tenant access attempt
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

// Privilege escalation prevention
export const preventPrivilegeEscalation = async (req, res, next) => {
  // Users cannot assign themselves higher roles than their own
  if (req.body.role && req.user.role !== 'ORG_ADMIN') {
    return res.status(403).json({ error: 'Only org admins can assign roles' });
  }

  next();
};

// Session refresh - invalidate old refresh tokens on reuse
export const checkRefreshTokenRotation = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('+refreshTokenVersion +refreshToken');
    
    if (!user || !user.refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    // Verify token hasn't been reused (version mismatch = potential theft)
    const decoded = verifyRefreshToken(user.refreshToken);
    if (decoded.version !== user.refreshTokenVersion) {
      // Token theft detected - invalidate all tokens
      user.refreshToken = null;
      user.refreshTokenVersion += 1;
      await user.save();

      // Log security incident
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
