import { AuthService } from '../services/AuthService.js';
import { UserService } from '../services/UserService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class AuthController {
  // POST /api/auth/register
  static register = asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.validatedBody);
    res.status(201).json({
      message: 'User registered successfully',
      user: result,
    });
  });

  // POST /api/auth/login
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.validatedBody;
    const ipAddress = req.ip;

    const result = await AuthService.login(email, password, ipAddress);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful',
      accessToken: result.accessToken,
      user: result.user,
    });
  });

  // POST /api/auth/refresh
  static refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const ipAddress = req.ip;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    const result = await AuthService.refreshAccessToken(
      refreshToken,
      req.user.userId,
      req.user.orgId,
      ipAddress
    );

    // Update refresh token cookie
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

  // POST /api/auth/logout
  static logout = asyncHandler(async (req, res) => {
    await AuthService.logout(req.user.userId, req.user.orgId, req.ip);

    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful' });
  });

  // POST /api/auth/change-password
  static changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.validatedBody;

    const result = await AuthService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    // Invalidate all tokens on password change
    res.clearCookie('refreshToken');
    res.json(result);
  });

  // GET /api/auth/me
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
