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
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().transform(Number).default('8080'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),

  // Email (optional in development)
  EMAIL_USER: z.string().email().optional(),
  EMAIL_PASS: z.string().optional(),

  // Email Team (para emails de crafter/boas-vindas)
  EMAIL_TEAM_USER: z.string().email().optional(),
  EMAIL_TEAM_PASS: z.string().optional(),

  // Mercado Pago (optional in development)
  MP_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MERCADO_PAGO_PUBLIC_KEY: z.string().optional(),
  MP_PUBLIC_KEY: z.string().optional(),
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || (val !== undefined && val.length > 0),
    { message: 'MP_WEBHOOK_SECRET é obrigatório em produção' }
  ),
  MP_SUCCESS_URL: z.string().optional(),
  MP_FAILURE_URL: z.string().optional(),
  MP_PENDING_URL: z.string().optional(),
  MP_WEBHOOK_URL: z.string().optional(),

  // Downloads (disco persistente do Render: /var/downloads)
  DOWNLOADS_DIR: z.string().optional(),

  // FTP Hostinger (para upload de executáveis)
  FTP_HOST: z.string().optional(),
  FTP_USER: z.string().optional(),
  FTP_PASSWORD: z.string().optional(),
  FTP_PORT: z.coerce.number().optional(),
  FTP_REMOTE_PATH: z.string().optional(),
  FTP_PUBLIC_URL: z.string().optional(),

  // Chave RSA para assinatura de licenças (PEM ou base64)
  PRIVATE_KEY_PEM: z.string().optional(),
  PRIVATE_KEY_PEM_B64: z.string().optional(),

  // Admin
  // Em produção: obrigatório, min 32 chars, não pode ser default fraco.
  ADMIN_RESET_TOKEN: z.string().optional().refine(
    (val) => {
      if (process.env.NODE_ENV !== 'production') return true;
      if (!val || val.length < 32) return false;
      if (val === 'codecraftgenz') return false;
      if (val.startsWith('CHANGE_ME')) return false;
      return true;
    },
    { message: 'ADMIN_RESET_TOKEN deve ser forte em produção (min 32 chars, não default)' }
  ),

  // NFS-e (Nota Fiscal de Servico Eletronica)
  NFSE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  NFSE_CERT_PATH: z.string().optional(),
  NFSE_CERT_PASSWORD: z.string().optional(),
  NFSE_PRESTADOR_CNPJ: z.string().optional(),
  NFSE_PRESTADOR_IM: z.string().optional(),
  NFSE_COD_MUNICIPIO: z.string().default('3543402'),

  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Google OAuth (login)
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Google Calendar (team metas)
  GOOGLE_CALENDAR_CLIENT_ID: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().optional(),
  BACKEND_URL: z.string().default('http://localhost:8080'),

  // Push Notifications (PWA - VAPID)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().default('mailto:contato@codecraftgenz.com.br'),

  // Discord Bot
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: z.string().optional(),
  INTERNAL_BOT_URL: z.string().default('http://127.0.0.1:3001'),
  INTERNAL_WEBHOOK_SECRET: z.string().optional(),
  DISCORD_TOKEN_ENCRYPT_KEY: z.string().optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || (val !== undefined && val.length >= 32),
    { message: 'DISCORD_TOKEN_ENCRYPT_KEY (min 32 chars) é obrigatório em produção' }
  ),

  // PII Encryption (criptografia de campos sensíveis em repouso: mfaSecret, invoices, etc.)
  PII_ENCRYPT_KEY: z.string().min(32).optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || (val !== undefined && val.length >= 32),
    { message: 'PII_ENCRYPT_KEY (min 32 chars) é obrigatória em produção' }
  ),

  // Sentry (error tracking)
  SENTRY_DSN: z.string().url().optional(),

  // =============================================
  // PAINEL INTERNO (tarefas/delegação)
  // =============================================
  // Secret JWT separado do site (isolamento de tokens entre serviços).
  PANEL_JWT_SECRET: z.string().min(32).optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || (val !== undefined && val.length >= 32),
    { message: 'PANEL_JWT_SECRET (min 32 chars) é obrigatório em produção' }
  ),
  // Lista de emails autorizados a logar no painel (CSV, case-insensitive).
  PANEL_ALLOWED_EMAILS: z.string().optional(),
  // Duração da sessão do painel (default 8h).
  PANEL_SESSION_HOURS: z.coerce.number().int().positive().default(8),
  // Custo do bcrypt (default 12 — recomendado OWASP para 2026).
  PANEL_BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),
  // Diretório fora do webroot para armazenar anexos.
  PANEL_UPLOAD_DIR: z.string().default('/var/panel-uploads'),
  // Tamanho máximo de upload (bytes). Default 10MB.
  PANEL_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
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
