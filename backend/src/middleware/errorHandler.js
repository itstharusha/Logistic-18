import AuditLog from '../models/AuditLog.js';

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

// Centralized error handler
export const errorHandler = async (err, req, res, next) => {
  console.error('Error:', err.message);

  // Log to audit trail if user is authenticated
  if (req.user) {
    try {
      await AuditLog.create({
        orgId: req.user.orgId,
        userId: req.user.userId,
        action: 'ERROR',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to log audit:', auditError.message);
    }
  }

  // Handle AppError (custom errors with status codes)
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry - resource already exists' });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500,
  });
};

// Not found handler
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
};

// Async error wrapper for express handlers
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
