import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
  adminResetPasswordSchema,
} from '../schemas/user.schema.js';

const router = Router();

/**
 * GET /api/auth/users
 * Get all users (admin only)
 */
router.get('/', authenticate, authorizeAdmin, userController.getAll);

/**
 * GET /api/auth/users/:id
 * Get user by ID (admin only)
 */
router.get('/:id', authenticate, authorizeAdmin, validate(userIdSchema), userController.getById);

/**
 * POST /api/auth/users
 * Create new user (admin only)
 */
router.post('/', authenticate, authorizeAdmin, validate(createUserSchema), userController.create);

/**
 * PUT /api/auth/users/:id
 * Update user (admin only)
 */
router.put('/:id', authenticate, authorizeAdmin, validate(updateUserSchema), userController.update);

/**
 * PATCH /api/auth/users/:id/toggle-status
 * Toggle user status (admin only)
 */
router.patch('/:id/toggle-status', authenticate, authorizeAdmin, validate(userIdSchema), userController.toggleStatus);

/**
 * DELETE /api/auth/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', authenticate, authorizeAdmin, validate(userIdSchema), userController.delete);

/**
 * POST /api/auth/admin/reset-password
 * Admin reset password (requires x-admin-reset-token header)
 */
router.post('/admin/reset-password', validate(adminResetPasswordSchema), userController.adminResetPassword);

export default router;
