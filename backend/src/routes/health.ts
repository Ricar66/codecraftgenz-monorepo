import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { env, isProd } from '../config/env.js';

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

export default router;
