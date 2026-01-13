import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Request validation schema structure
 */
interface ValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validated request data
 */
export interface ValidatedRequest {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

// Extend Express Request to include validated data
declare global {
  namespace Express {
    interface Request {
      validated: ValidatedRequest;
    }
  }
}

/**
 * Validation Middleware Factory
 * Creates a middleware that validates request body, query, and params using Zod schemas
 *
 * @example
 * ```ts
 * const createUserSchema = {
 *   body: z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8),
 *   }),
 * };
 *
 * router.post('/users', validate(createUserSchema), createUser);
 * ```
 */
export function validate(schema: ValidationSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated: ValidatedRequest = {};

      // Validate body if schema provided
      if (schema.body) {
        validated.body = await schema.body.parseAsync(req.body);
      }

      // Validate query if schema provided
      if (schema.query) {
        validated.query = await schema.query.parseAsync(req.query);
      }

      // Validate params if schema provided
      if (schema.params) {
        validated.params = await schema.params.parseAsync(req.params);
      }

      // Attach validated data to request
      req.validated = validated;

      next();
    } catch (error) {
      // Let error handler deal with Zod errors
      next(error);
    }
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination query params
  pagination: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
  }),

  // ID param
  idParam: z.object({
    id: z.string().cuid(),
  }),

  // UUID param
  uuidParam: z.object({
    id: z.string().uuid(),
  }),

  // Email
  email: z.string().email('Email inválido'),

  // Password (min 8 chars, at least 1 number)
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/\d/, 'Senha deve conter pelo menos 1 número'),
};
