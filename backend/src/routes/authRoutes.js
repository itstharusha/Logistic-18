import express from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/register', validate('register'), AuthController.register);
router.post('/login', validate('login'), AuthController.login);
router.post('/refresh', AuthController.refresh);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.post('/change-password', authenticate, validate('changePassword'), AuthController.changePassword);
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;
