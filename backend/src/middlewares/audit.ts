// src/middlewares/audit.ts
// Middleware de auditoria global - intercepta mutações automaticamente

import { Request, Response, NextFunction } from 'express';
import { logAudit } from '../services/audit.service.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SKIP_PATHS = ['/api/auth/login', '/api/auth/register', '/health'];

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const path = req.originalUrl || req.path;
  if (SKIP_PATHS.some(p => path.startsWith(p))) {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    // Skip 5xx (already logged by error handler)
    if (res.statusCode >= 500) return;

    logAudit({
      userId: (req as any).user?.id,
      userName: (req as any).user?.name || (req as any).user?.email,
      method: req.method,
      path,
      statusCode: res.statusCode,
      body: req.body,
      oldData: (req as any).auditOldData,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.get('user-agent'),
      duration: Date.now() - start,
    });
  });

  next();
}
