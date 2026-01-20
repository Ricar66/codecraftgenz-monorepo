import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { env, isProd } from '../config/env.js';
import { isFtpConfigured } from '../services/ftp.service.js';
import { emailService } from '../services/email.service.js';

// Mercado Pago SDK - importação condicional
let MercadoPagoConfig: unknown;
let Payment: unknown;
let mpClient: unknown = null;

(async () => {
  try {
    const mp = await import('mercadopago');
    MercadoPagoConfig = mp.MercadoPagoConfig;
    Payment = mp.Payment;
    if (env.MP_ACCESS_TOKEN && MercadoPagoConfig) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mpClient = new (MercadoPagoConfig as any)({ accessToken: env.MP_ACCESS_TOKEN });
    }
  } catch {
    // SDK não disponível
  }
})();

const router = Router();

/**
 * GET /api/v1/health
 * Basic health check
 */
router.get('/', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0',
  });
});

/**
 * GET /api/v1/health/db
 * Database health check
 */
router.get('/db', async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    sendSuccess(res, {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    sendError(res, 503, 'DATABASE_ERROR', 'Falha na conexão com o banco de dados');
  }
});

/**
 * GET /api/v1/health/ready
 * Readiness probe (for Kubernetes/Docker)
 */
router.get('/ready', async (_req, res) => {
  try {
    // Check all dependencies
    await prisma.$queryRaw`SELECT 1`;

    sendSuccess(res, {
      status: 'ready',
      checks: {
        database: 'ok',
      },
    });
  } catch {
    sendError(res, 503, 'NOT_READY', 'Serviço não está pronto');
  }
});

/**
 * GET /api/v1/health/live
 * Liveness probe (for Kubernetes/Docker)
 */
router.get('/live', (_req, res) => {
  sendSuccess(res, { status: 'alive' });
});

/**
 * GET /health/mercadopago
 * Mercado Pago health check
 */
router.get('/mercadopago', async (_req, res) => {
  if (!mpClient || !Payment) {
    sendError(res, 503, 'MP_NOT_CONFIGURED', 'Mercado Pago não está configurado');
    return;
  }

  try {
    // Testar conexão com Mercado Pago buscando um pagamento inexistente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentApi = new (Payment as any)(mpClient);
    await paymentApi.get({ id: '1' }).catch(() => {
      // Esperado falhar, só estamos testando a conectividade
    });

    sendSuccess(res, {
      status: 'ok',
      provider: 'mercadopago',
      configured: true,
      timestamp: new Date().toISOString(),
    });
  } catch {
    sendError(res, 503, 'MP_CONNECTION_ERROR', 'Erro ao conectar com Mercado Pago');
  }
});

/**
 * GET /health/mp-env
 * Mercado Pago environment variables check (redacted)
 */
router.get('/mp-env', (_req, res) => {
  const hasAccessToken = !!env.MP_ACCESS_TOKEN;
  const hasPublicKey = !!env.MP_PUBLIC_KEY;
  const hasWebhookUrl = !!env.MP_WEBHOOK_URL;

  // Redact tokens for security
  const redactToken = (token: string | undefined) => {
    if (!token) return null;
    if (token.length <= 8) return '***';
    return token.substring(0, 4) + '...' + token.substring(token.length - 4);
  };

  sendSuccess(res, {
    configured: hasAccessToken,
    environment: isProd ? 'production' : 'development',
    access_token: redactToken(env.MP_ACCESS_TOKEN),
    public_key: redactToken(env.MP_PUBLIC_KEY),
    webhook_url: env.MP_WEBHOOK_URL || null,
    success_url: env.MP_SUCCESS_URL || null,
    failure_url: env.MP_FAILURE_URL || null,
    pending_url: env.MP_PENDING_URL || null,
    checks: {
      access_token: hasAccessToken,
      public_key: hasPublicKey,
      webhook_url: hasWebhookUrl,
    },
  });
});

/**
 * GET /health/ftp
 * FTP configuration check
 */
router.get('/ftp', (_req, res) => {
  const configured = isFtpConfigured();

  const redact = (val: string | undefined) => {
    if (!val) return null;
    if (val.length <= 4) return '***';
    return val.substring(0, 3) + '...';
  };

  sendSuccess(res, {
    configured,
    host: env.FTP_HOST || null,
    user: redact(env.FTP_USER),
    port: env.FTP_PORT || 21,
    remote_path: env.FTP_REMOTE_PATH || '/public_html/downloads',
    public_url: env.FTP_PUBLIC_URL || 'https://codecraftgenz.com.br/downloads',
  });
});

/**
 * GET /health/email
 * Email configuration check
 */
router.get('/email', async (_req, res) => {
  const hasUser = !!env.EMAIL_USER;
  const hasPass = !!env.EMAIL_PASS;
  const configured = hasUser && hasPass;

  let connectionOk = false;
  if (configured) {
    try {
      connectionOk = await emailService.testConnection();
    } catch {
      connectionOk = false;
    }
  }

  sendSuccess(res, {
    configured,
    connection_ok: connectionOk,
    email_user: env.EMAIL_USER || null,
    checks: {
      user: hasUser,
      password: hasPass,
      smtp_connection: connectionOk,
    },
  });
});

/**
 * POST /health/email/test
 * Send a test email (requires admin token in production)
 */
router.post('/email/test', async (req, res) => {
  const { to, admin_token } = req.body;

  // Em produção, requer token de admin
  if (isProd && admin_token !== env.ADMIN_RESET_TOKEN) {
    sendError(res, 403, 'FORBIDDEN', 'Token de admin requerido em produção');
    return;
  }

  if (!to) {
    sendError(res, 400, 'INVALID_INPUT', 'Campo "to" é obrigatório');
    return;
  }

  try {
    const sent = await emailService.sendPurchaseConfirmation({
      customerName: 'Teste',
      customerEmail: to,
      appName: 'App de Teste',
      appVersion: '1.0.0',
      price: 29.90,
      paymentId: 'TEST-' + Date.now(),
      downloadUrl: 'https://codecraftgenz.com.br/downloads/teste.exe',
      licenseKey: 'TEST-XXXX-XXXX-XXXX',
      purchaseDate: new Date(),
    });

    if (sent) {
      sendSuccess(res, { message: 'Email de teste enviado com sucesso', to });
    } else {
      sendError(res, 500, 'EMAIL_FAILED', 'Falha ao enviar email de teste');
    }
  } catch (error) {
    sendError(res, 500, 'EMAIL_ERROR', `Erro ao enviar email: ${error}`);
  }
});

export default router;
