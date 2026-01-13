import { Router } from 'express';
import { financeController } from '../controllers/finance.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';

const router = Router();

/**
 * GET /api/financas
 * Get all finance records (admin only)
 */
router.get('/', authenticate, authorizeAdmin, financeController.getAll);

/**
 * GET /api/financas/:id
 * Get finance record by ID (admin only)
 */
router.get('/:id', authenticate, authorizeAdmin, financeController.getById);

/**
 * POST /api/financas
 * Create new finance record (admin only)
 */
router.post('/', authenticate, authorizeAdmin, financeController.create);

/**
 * PUT /api/financas/:id
 * Update finance record (admin only)
 */
router.put('/:id', authenticate, authorizeAdmin, financeController.update);

/**
 * DELETE /api/financas/:id
 * Delete finance record (admin only)
 */
router.delete('/:id', authenticate, authorizeAdmin, financeController.delete);

export default router;
