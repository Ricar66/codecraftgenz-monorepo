import { z } from 'zod';

/**
 * Create user schema
 */
export const createUserSchema = {
  body: z.object({
    email: z.string().email('Email inválido'),
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    role: z.string().optional().default('viewer'),
  }),
};

/**
 * Update user schema
 */
export const updateUserSchema = {
  body: z.object({
    email: z.string().email('Email inválido').optional(),
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
  }),
  params: z.object({
    id: z.string().transform(Number),
  }),
};

/**
 * User ID param schema
 */
export const userIdSchema = {
  params: z.object({
    id: z.string().transform(Number),
  }),
};

/**
 * Admin reset password schema
 */
export const adminResetPasswordSchema = {
  body: z.object({
    email: z.string().email('Email inválido'),
    new_password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  }),
};

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema.body>;
export type UpdateUserInput = z.infer<typeof updateUserSchema.body>;
