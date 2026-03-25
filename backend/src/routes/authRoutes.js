/**
 * authRoutes.js — Express Router for Authentication API
 *
 * Responsibility:
 *   Defines all HTTP routes for user authentication and maps them to
 *   AuthController handlers with appropriate middleware.
 *
 *   Base path: /api/auth (mounted in app.js)
 *
 *   Public routes (no authentication required):
 *   - POST /register  — create a new user account
 *   - POST /login     — authenticate and receive tokens
 *   - POST /refresh   — exchange a refresh token for a new access token
 *
 *   Protected routes (require valid JWT via authenticate middleware):
 *   - POST /logout           — invalidate the refresh token
 *   - POST /change-password  — change the user's password
 *   - GET  /me               — fetch the current user's profile
 *
 *   Validation middleware (validate()) runs Joi schema validation on req.body
 *   before the request reaches the controller. Invalid requests are rejected
 *   with a 400 response containing per-field error details.
 */

import express from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// ── Public Routes (no token required) ────────────────────────────────────────

// Register a new user account (requires name, email, password, orgId in body)
router.post('/register', validate('register'), AuthController.register);

// Login with email + password — returns access token and sets refresh cookie
router.post('/login', validate('login'), AuthController.login);

// Exchange a refresh token for a new access token (token rotation)
router.post('/refresh', AuthController.refresh);

// ── Protected Routes (valid JWT required) ─────────────────────────────────────

// Invalidate the refresh token and clear the session
router.post('/logout', authenticate, AuthController.logout);

// Change the user's password (must provide current password to confirm identity)
router.post('/change-password', authenticate, validate('changePassword'), AuthController.changePassword);

// Return the currently authenticated user's profile data
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;
