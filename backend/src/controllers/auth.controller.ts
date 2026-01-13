import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import { isProd } from '../config/env.js';
import type {
  LoginInput,
  RegisterInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  ChangePasswordInput,
} from '../schemas/auth.schema.js';

/**
 * Cookie options for JWT token
 */
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ('strict' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Auth Controller
 * Handles HTTP requests for authentication
 */
export const authController = {
  /**
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.validated.body as LoginInput;
      const result = await authService.login(data);

      // Set cookie
      res.cookie('token', result.token, cookieOptions);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.validated.body as RegisterInput;
      const result = await authService.register(data);

      // Set cookie
      res.cookie('token', result.token, cookieOptions);

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('token');
    sendSuccess(res, { message: 'Logout realizado com sucesso' });
  },

  /**
   * GET /api/v1/auth/me
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.me(req.user!.id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/password-reset/request
   */
  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.validated.body as PasswordResetRequestInput;
      await authService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      sendSuccess(res, {
        message: 'Se o email existir, você receberá um link de recuperação',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/password-reset/confirm
   */
  async confirmPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.validated.body as PasswordResetConfirmInput;
      await authService.confirmPasswordReset(token, password);

      sendSuccess(res, { message: 'Senha alterada com sucesso' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/change-password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.validated.body as ChangePasswordInput;
      await authService.changePassword(req.user!.id, currentPassword, newPassword);

      sendSuccess(res, { message: 'Senha alterada com sucesso' });
    } catch (error) {
      next(error);
    }
  },
};
