import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../db/prisma.js';

/**
 * JWT Payload type
 */
export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
}

// Extend Express Request to include user and validated data
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

/**
 * Extract token from request
 * Checks Authorization header (Bearer token) and cookies
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      throw AppError.unauthorized('Token não fornecido');
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, status: true },
    });

    if (!user) {
      throw AppError.unauthorized('Usuário não encontrado');
    }

    if (user.status !== 'ativo') {
      throw AppError.forbidden('Conta desativada ou suspensa');
    }

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized('Token inválido'));
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Token expirado'));
      return;
    }

    next(error);
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;

    next();
  } catch {
    // Token invalid, but that's ok for optional auth
    next();
  }
}

/**
 * Authorization Middleware Factory
 * Checks if user has required role
 *
 * @example
 * router.delete('/users/:id', authenticate, authorize('ADMIN'), deleteUser);
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Autenticação necessária'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(AppError.forbidden('Permissão insuficiente'));
      return;
    }

    next();
  };
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Admin Authorization Middleware
 * Shortcut for authorize('admin')
 */
export function authorizeAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(AppError.unauthorized('Autenticação necessária'));
    return;
  }

  if (req.user.role !== 'admin') {
    next(AppError.forbidden('Acesso restrito a administradores'));
    return;
  }

  next();
}
