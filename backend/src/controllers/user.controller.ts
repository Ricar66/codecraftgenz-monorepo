import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';

/**
 * User Controller
 * Handles HTTP requests for user management (admin)
 */
export const userController = {
  /**
   * GET /api/auth/users
   * Get all users (admin only)
   */
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.getAll();
      sendSuccess(res, { users });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/users/:id
   * Get user by ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const user = await userService.getById(id);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/users
   * Create new user (admin only)
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nome, email, senha, role } = req.body;
      const user = await userService.create({
        email,
        name: nome,
        password: senha,
        role,
      });
      sendSuccess(res, { user }, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/auth/users/:id
   * Update user (admin only)
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const { nome, email, role, status, senha } = req.body;
      const user = await userService.update(id, {
        name: nome,
        email,
        role,
        status,
        password: senha,
      });
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/auth/users/:id/toggle-status
   * Toggle user status
   */
  async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const user = await userService.toggleStatus(id);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/auth/users/:id
   * Delete user (admin only)
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      await userService.delete(id);
      sendSuccess(res, { message: 'Usuário deletado com sucesso' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/admin/reset-password
   * Admin reset password (requires x-admin-reset-token header)
   */
  async adminResetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers['x-admin-reset-token'];

      if (!token || token !== env.ADMIN_RESET_TOKEN) {
        res.status(403).json({ success: false, error: { message: 'Token de admin inválido' } });
        return;
      }

      const { email, new_password } = req.body;
      const result = await userService.adminResetPassword(email, new_password);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};
