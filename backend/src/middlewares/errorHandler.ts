import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent error responses
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      body: req.body,
      params: req.params,
      query: req.query,
    },
  });

  // Handle AppError (our custom errors)
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 400, 'VALIDATION_ERROR', 'Dados inválidos', details);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 401, 'INVALID_TOKEN', 'Token inválido');
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, 401, 'TOKEN_EXPIRED', 'Token expirado');
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    // @ts-expect-error Prisma error code
    const code = err.code as string;

    if (code === 'P2002') {
      sendError(res, 409, 'DUPLICATE_ENTRY', 'Registro já existe');
      return;
    }

    if (code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Registro não encontrado');
      return;
    }
  }

  // Handle syntax errors (invalid JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 400, 'INVALID_JSON', 'JSON inválido no corpo da requisição');
    return;
  }

  // Generic error (hide details in production)
  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    isProd ? 'Erro interno do servidor' : err.message,
    isProd ? undefined : err.stack
  );
};

/**
 * Not Found Handler
 * Catches 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, 404, 'NOT_FOUND', `Rota ${req.method} ${req.path} não encontrada`);
};
