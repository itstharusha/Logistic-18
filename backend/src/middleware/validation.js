/**
 * validation.js — Request Body Validation Middleware
 *
 * Responsibility:
 *   Uses the Joi library to define and enforce strict input validation schemas
 *   for all incoming request bodies on auth and user routes.
 *
 *   Two exports:
 *   - schemas          : Object of named Joi validation schemas (one per route type).
 *   - validate(key)    : Middleware factory — takes a schema key, validates req.body,
 *                        and either attaches the cleaned data to req.validatedBody
 *                        or returns a 400 error with per-field details.
 *   - validatePasswordStrength : Utility function used client-side style to score
 *                        how strong a password is (not currently used as middleware).
 */

import joi from 'joi';

/**
 * schemas
 * Named Joi schemas for each supported validation context.
 * The password pattern requires at least one uppercase, one lowercase, one digit.
 */
export const schemas = {
  // User registration — all fields required
  register: joi.object({
    name: joi.string().min(2).max(100).required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).max(50).required()
      .pattern(/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/), // password strength
    orgId: joi.string().required(), // Must reference an existing organisation
  }),

  // User login — only email + password needed
  login: joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
  }),

  // Profile update — all fields optional; only provided fields are changed
  updateUser: joi.object({
    name: joi.string().min(2).max(100).optional(),
    email: joi.string().email().optional(),
    role: joi.string().valid('VIEWER', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'RISK_ANALYST', 'ORG_ADMIN').optional(),
    isActive: joi.boolean().optional(),
  }),

  // Role assignment — both userId and target role required
  assignRole: joi.object({
    userId: joi.string().required(),
    role: joi.string().valid('VIEWER', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'RISK_ANALYST', 'ORG_ADMIN').required(),
  }),

  // Password change — must provide current password to confirm identity
  changePassword: joi.object({
    currentPassword: joi.string().required(),
    newPassword: joi.string().min(8).max(50).required()
      .pattern(/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/),
  }),

  // Token refresh — accepts a raw refresh token string
  refreshToken: joi.object({
    refreshToken: joi.string().required(),
  }),
};

/**
 * validate(schemaKey)
 * Middleware factory that validates req.body against the named Joi schema.
 *
 * - abortEarly: false   → collect ALL validation errors, not just the first one
 * - stripUnknown: true  → silently remove any fields not in the schema
 *
 * On success: attaches cleaned/sanitised data to req.validatedBody, calls next()
 * On failure: returns HTTP 400 with an array of field-level error details
 */
export const validate = (schemaKey) => {
  return (req, res, next) => {
    const schema = schemas[schemaKey];

    // Guard: schema key must exist
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // Return all errors at once
      stripUnknown: true,  // Remove unexpected fields for security
    });

    if (error) {
      // Format errors as an array of { field, message } objects for the frontend
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }

    // Replace req.body with the sanitised and type-coerced value
    req.validatedBody = value;
    next();
  };
};

/**
 * validatePasswordStrength
 * Utility function that scores a password against 5 requirements.
 * Returns an object indicating which requirements are met and an overall score.
 *
 * Requirements:
 *   - minLength:      at least 8 characters
 *   - hasUppercase:   at least one uppercase letter
 *   - hasLowercase:   at least one lowercase letter
 *   - hasNumber:      at least one digit
 *   - hasSpecialChar: at least one of !@#$%^&*
 *
 * isStrong = true when at least 4 of 5 requirements are satisfied.
 */
export const validatePasswordStrength = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*]/.test(password),
  };

  const meetsRequirements = Object.values(requirements).filter(v => v).length;
  return {
    isStrong: meetsRequirements >= 4,
    requirements,
    score: meetsRequirements, // 0–5
  };
};
