/**
 * errors.js — Custom Application Error Classes
 *
 * Responsibility:
 *   Defines a hierarchy of typed error classes used throughout the backend.
 *   Each error carries an HTTP status code so the global error handler
 *   (errorHandler.js) can map it directly to the correct HTTP response
 *   without any if/else logic in controllers or services.
 *
 *   Error hierarchy:
 *     AppError (base)
 *       ├── ValidationError    → 400 Bad Request
 *       ├── AuthenticationError → 401 Unauthorized
 *       ├── AuthorizationError  → 403 Forbidden
 *       ├── NotFoundError       → 404 Not Found
 *       └── ConflictError       → 409 Conflict
 */

/**
 * AppError — Base class for all application-level errors.
 * Extends the native Error to attach an HTTP status code.
 * Use this directly only when none of the subclasses fit.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode; // Used by errorHandler to set HTTP status
    this.status = statusCode;     // Alias kept for compatibility
    Error.captureStackTrace(this, this.constructor); // Clean stack trace
  }
}

/**
 * ValidationError — Thrown when request data fails validation rules.
 * Maps to HTTP 400 Bad Request.
 * Example: missing required field, invalid email format, out-of-range number.
 */
export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * AuthenticationError — Thrown when identity cannot be verified.
 * Maps to HTTP 401 Unauthorized.
 * Example: wrong password, expired token, missing Authorization header.
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * AuthorizationError — Thrown when an authenticated user lacks permission.
 * Maps to HTTP 403 Forbidden.
 * Example: a VIEWER trying to create a supplier, cross-org access attempt.
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * NotFoundError — Thrown when a requested resource does not exist.
 * Maps to HTTP 404 Not Found.
 * Example: fetching a supplier by an ID that doesn't exist in the database.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * ConflictError — Thrown when an operation conflicts with existing data.
 * Maps to HTTP 409 Conflict.
 * Example: registering a user with an email that already exists.
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}
