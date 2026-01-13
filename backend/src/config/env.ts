import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment Variables Schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8080'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Email (optional in development)
  EMAIL_USER: z.string().email().optional(),
  EMAIL_PASS: z.string().optional(),

  // Mercado Pago (optional in development)
  MP_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MERCADO_PAGO_PUBLIC_KEY: z.string().optional(),
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  MP_SUCCESS_URL: z.string().optional(),
  MP_FAILURE_URL: z.string().optional(),
  MP_PENDING_URL: z.string().optional(),
  MP_WEBHOOK_URL: z.string().optional(),

  // Admin
  ADMIN_RESET_TOKEN: z.string().optional(),

  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

// Parse and validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Type-safe environment
export type Env = z.infer<typeof envSchema>;

// Helper to check if in production
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
