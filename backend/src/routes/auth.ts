import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter, sensitiveLimiter } from '../middlewares/rateLimiter.js';
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
} from '../schemas/auth.schema.js';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

/**
 * POST /api/v1/auth/register
 * Register new user
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register
);

/**
 * POST /api/v1/auth/logout
 * Logout user
 */
router.post('/logout', authController.logout);

/**
 * GET /api/v1/auth/me
 * Get current user
 */
router.get('/me', authenticate, authController.me);

/**
 * POST /api/v1/auth/password-reset/request
 * Request password reset email
 */
router.post(
  '/password-reset/request',
  sensitiveLimiter,
  validate(passwordResetRequestSchema),
  authController.requestPasswordReset
);

/**
 * POST /api/v1/auth/password-reset/confirm
 * Confirm password reset with token
 */
router.post(
  '/password-reset/confirm',
  sensitiveLimiter,
  validate(passwordResetConfirmSchema),
  authController.confirmPasswordReset
);

/**
 * POST /api/v1/auth/change-password
 * Change password (authenticated)
 */
router.post(
  '/change-password',
  authenticate,
  sensitiveLimiter,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
