import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';

const ADMIN_ROLES = ['admin', 'administrator', 'superadmin', 'owner'];

/**
 * Skip rate limiting for authenticated admin users
 */
function isAdmin(req: any): boolean {
  try {
    const auth = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return false;
    const token = auth.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    return ADMIN_ROLES.includes(decoded?.role);
  } catch {
    return false;
  }
}

/**
 * Default rate limiter
 * 500 requests per 15 minutes (SPA faz ~15 req por page load)
 * Admins: sem limite
 */
export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isAdmin,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Muitas requisições, tente novamente em 15 minutos');
  },
});

/**
 * Strict rate limiter for authentication routes
 * 10 requests per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Muitas tentativas de login, tente novamente em 15 minutos');
  },
  keyGenerator: (req) => {
    // Use IP + email for login attempts
    const email = req.body?.email || '';
    return `${req.ip}-${email}`;
  },
});

/**
 * Sensitive operations limiter
 * 5 requests per hour
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isAdmin,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Muitas requisições para esta operação, tente novamente em 1 hora');
  },
});

/**
 * API rate limiter (generous for general API calls)
 * 1000 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isAdmin,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Limite de requisições excedido');
  },
});

/**
 * Combined rate limiter object for easy import
 */
export const rateLimiter = {
  default: defaultLimiter,
  auth: authLimiter,
  sensitive: sensitiveLimiter,
  api: apiLimiter,
};
