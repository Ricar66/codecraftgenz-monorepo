import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response.js';

/**
 * Default rate limiter
 * 100 requests per 15 minutes
 */
export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
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
  handler: (req, res) => {
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
  handler: (req, res) => {
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
  handler: (req, res) => {
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
