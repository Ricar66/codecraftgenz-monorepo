import { z } from 'zod';

/**
 * Login schema
 */
export const loginSchema = {
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
  }),
};

/**
 * Register schema
 */
export const registerSchema = {
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .regex(/\d/, 'Senha deve conter pelo menos 1 número'),
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  }),
};

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = {
  body: z.object({
    email: z.string().email('Email inválido'),
  }),
};

/**
 * Password reset confirm schema
 */
export const passwordResetConfirmSchema = {
  body: z.object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: z
      .string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .regex(/\d/, 'Senha deve conter pelo menos 1 número'),
  }),
};

/**
 * Change password schema
 */
export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
      .regex(/\d/, 'Nova senha deve conter pelo menos 1 número'),
  }),
};

// Type exports
export type LoginInput = z.infer<typeof loginSchema.body>;
export type RegisterInput = z.infer<typeof registerSchema.body>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema.body>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema.body>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema.body>;
