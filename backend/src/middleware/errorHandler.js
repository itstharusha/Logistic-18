/**
 * errorHandler.js — Global Express Middleware: Logging, Error Handling & 404
 *
 * Responsibility:
 *   Provides three Express middleware functions used in app.js:
 *
 *   1. requestLogger   — Logs every HTTP request with method, path, status code,
 *                        and response time. Attached before routes.
 *
 *   2. notFoundHandler — Catches any request that didn't match a registered route
 *                        and returns a 404 JSON response.
 *
 *   3. errorHandler    — The global "catch-all" error handler. Express calls this
 *                        whenever next(err) is called anywhere in the app or when
 *                        asyncHandler catches an unhandled promise rejection.
 *                        It maps error types to appropriate HTTP status codes and
 *                        optionally writes to the audit log.
 *
 *   4. asyncHandler    — A thin wrapper that converts async route handlers into
 *                        Express-compatible handlers by forwarding any rejected
 *                        promise to next(err) automatically.
 */

import AuditLog from '../models/AuditLog.js';

/**
 * requestLogger
 * Middleware that logs each request to the console once a response is sent.
 * Format: [ISO timestamp] METHOD /path - STATUS_CODE (duration ms)
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // 'finish' fires when the response has been fully sent to the client
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next(); // Pass control to the next middleware/route
};

/**
 * errorHandler
 * Global Express error handling middleware (must have 4 parameters: err, req, res, next).
 * Handles all errors thrown/forwarded in controllers, services, and repositories.
 *
 * Priority:
 *   1. Custom AppError subclasses (have a statusCode property)
 *   2. Mongoose ValidationError (schema validation failed)
 *   3. Mongoose CastError (invalid ObjectId format in URL params)
 *   4. MongoDB duplicate key error (code 11000)
 *   5. Default 500 Internal Server Error
 */
export const errorHandler = async (err, req, res, next) => {
  console.error('Error:', err.message);

  // Write server errors to the audit trail when a user is authenticated
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
      // Don't crash the error handler itself if audit logging fails
      console.error('Failed to log audit:', auditError.message);
    }
  }

  // Case 1: Custom application error (e.g. NotFoundError, ValidationError)
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Case 2: Mongoose schema validation failure (e.g. required field missing)
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.message });
  }

  // Case 3: Invalid MongoDB ObjectId in URL parameter (e.g. /suppliers/not-an-id)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Case 4: MongoDB unique constraint violation (e.g. duplicate email)
  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry - resource already exists' });
  }

  // Default: unexpected server error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500,
  });
};

/**
 * notFoundHandler
 * Catches requests to undefined routes and returns a descriptive 404 response.
 * Must be registered AFTER all routes in app.js.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
};

/**
 * asyncHandler
 * Wraps an async Express route handler to automatically catch any rejected
 * promise and forward it to the global error handler via next(err).
 *
 * Usage:
 *   router.get('/example', asyncHandler(async (req, res) => {
 *     const data = await someAsyncOperation();
 *     res.json(data);
 *   }));
 *
 * Without this wrapper, unhandled async errors silently hang the request.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
