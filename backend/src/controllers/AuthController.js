/**
 * AuthController.js — HTTP Request Handlers for Authentication Routes
 *
 * Responsibility:
 *   Handles all incoming HTTP requests on /api/auth/* routes.
 *   Each method extracts the relevant data from the request, calls the appropriate
 *   AuthService or UserService method, and sends the HTTP response.
 *
 *   Controllers do NOT contain any business logic — all logic lives in the service layer.
 *   All methods are wrapped with asyncHandler() so any thrown error is automatically
 *   forwarded to the global error handler middleware.
 *
 *   Routes handled:
 *   POST /api/auth/register      → register
 *   POST /api/auth/login         → login
 *   POST /api/auth/refresh       → refresh (public — no authenticate middleware)
 *   POST /api/auth/logout        → logout (requires authenticate)
 *   POST /api/auth/change-password → changePassword (requires authenticate)
 *   GET  /api/auth/me            → getCurrentUser (requires authenticate)
 */

import { AuthService } from '../services/AuthService.js';
import { UserService } from '../services/UserService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class AuthController {

  /**
   * register
   * POST /api/auth/register
   * Validates the request body via the 'register' Joi schema (in validation middleware),
   * then creates a new user. Does NOT log the user in.
   *
   * Uses req.validatedBody (set by validation middleware) rather than req.body
   * to ensure the data has been sanitised and validated.
   */
  static register = asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.validatedBody);
    res.status(201).json({
      message: 'User registered successfully',
      user: result,
    });
  });

  /**
   * login
   * POST /api/auth/login
   * Authenticates the user with email + password.
   * On success: sets an httpOnly refresh token cookie and returns the access token
   * + user object in the response body.
   *
   * The httpOnly cookie prevents JavaScript access to the refresh token (XSS protection).
   * The access token is returned in the body so the frontend can store it in memory/localStorage.
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.validatedBody;
    const ipAddress = req.ip; // Used for audit logging

    const result = await AuthService.login(email, password, ipAddress);

    // Store refresh token in a secure httpOnly cookie (not accessible via JavaScript)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',                              // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000,              // 7 days in milliseconds
    });

    res.json({
      message: 'Login successful',
      accessToken: result.accessToken,
      user: result.user,
    });
  });

  /**
   * refresh
   * POST /api/auth/refresh
   * Public endpoint — exchanges a valid refresh token for a new access token.
   * Accepts the refresh token from either the httpOnly cookie or the request body
   * (body fallback is used by the frontend's Axios interceptor).
   *
   * NB: This route has NO authenticate middleware, so req.user is undefined here.
   * The userId and orgId are decoded directly from the refresh token payload.
   */
  static refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const ipAddress = req.ip;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    // Decode userId and orgId from the refresh token itself —
    // this is a public route so req.user is not set by authenticate middleware
    let decoded;
    try {
      const { verifyRefreshToken } = await import('../middleware/auth.js');
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const result = await AuthService.refreshAccessToken(
      refreshToken,
      decoded.userId,
      decoded.orgId,
      ipAddress
    );

    // Rotate the refresh token cookie with the new token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Token refreshed successfully',
      accessToken: result.accessToken,
    });
  });

  /**
   * logout
   * POST /api/auth/logout
   * Invalidates the user's refresh token in the database and clears the cookie.
   * Protected route — requires authenticate middleware.
   */
  static logout = asyncHandler(async (req, res) => {
    await AuthService.logout(req.user.userId, req.user.orgId, req.ip);

    // Clear the refresh token cookie on the client
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful' });
  });

  /**
   * changePassword
   * POST /api/auth/change-password
   * Changes the user's password after verifying the current one.
   * The backend invalidates all refresh tokens after a password change,
   * so the user must log in again on all devices.
   * Protected route — requires authenticate middleware.
   */
  static changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.validatedBody;

    const result = await AuthService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    // Invalidating tokens also means the cookie is now useless — clear it
    res.clearCookie('refreshToken');
    res.json(result);
  });

  /**
   * getCurrentUser
   * GET /api/auth/me
   * Returns the currently authenticated user's profile.
   * Called on every app load to restore the session from the stored access token.
   * Protected route — requires authenticate middleware.
   */
  static getCurrentUser = asyncHandler(async (req, res) => {
    const user = await UserService.getProfile(req.user.userId);
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
    });
  });
}
