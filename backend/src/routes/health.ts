import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { env, isProd } from '../config/env.js';
import { isFtpConfigured } from '../services/ftp.service.js';
import { emailService } from '../services/email.service.js';
import { sensitiveLimiter } from '../middlewares/rateLimiter.js';

/**
 * Middleware para validar token de admin via header
 * Mais seguro que passar via body/query
 */
function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  // Aceita token via header (preferido) ou body (legacy)
  const headerToken = req.headers['x-admin-token'] as string | undefined;
  const bodyToken = req.body?.admin_token as string | undefined;
  const queryToken = req.query?.admin_token as string | undefined;

  const token = headerToken || bodyToken || queryToken;

  if (!token) {
    sendError(res, 401, 'UNAUTHORIZED', 'Token de admin requerido. Use header x-admin-token');
    return;
  }

  if (token !== env.ADMIN_RESET_TOKEN) {
    sendError(res, 403, 'FORBIDDEN', 'Token de admin inválido');
    return;
  }

  next();
}

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
 * POST /health/admin/test-email
 * Send a test email (requires admin token via header)
 */
router.post('/admin/test-email', sensitiveLimiter, requireAdminToken, async (req, res) => {
  const { to } = req.body;

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

/**
 * POST /health/admin/test-ftp
 * Test FTP upload by sending a small test file
 */
router.post('/admin/test-ftp', sensitiveLimiter, requireAdminToken, async (_req, res) => {
  if (!isFtpConfigured()) {
    sendError(res, 503, 'FTP_NOT_CONFIGURED', 'FTP não está configurado');
    return;
  }

  try {
    const { uploadToHostinger, deleteFromHostinger } = await import('../services/ftp.service.js');

    // Criar arquivo de teste
    const testFileName = `ftp-test-${Date.now()}.txt`;
    const testContent = Buffer.from(`FTP Test - ${new Date().toISOString()}\nThis file can be safely deleted.`);

    // Upload
    const publicUrl = await uploadToHostinger(testFileName, testContent);

    // Deletar após sucesso
    await deleteFromHostinger(testFileName);

    sendSuccess(res, {
      status: 'ok',
      message: 'FTP upload test successful',
      test_file: testFileName,
      public_url: publicUrl,
      uploaded_and_deleted: true,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    sendError(res, 500, 'FTP_TEST_FAILED', `Erro no teste FTP: ${errMsg}`);
  }
});

/**
 * GET /health/admin/ftp-list
 * List files in the downloads directory (for debugging)
 */
router.get('/admin/ftp-list', sensitiveLimiter, requireAdminToken, async (_req, res) => {
  if (!isFtpConfigured()) {
    sendError(res, 503, 'FTP_NOT_CONFIGURED', 'FTP não está configurado');
    return;
  }

  try {
    const ftp = await import('basic-ftp');
    const client = new ftp.Client();

    await client.access({
      host: env.FTP_HOST!,
      user: env.FTP_USER!,
      password: env.FTP_PASSWORD!,
      port: env.FTP_PORT ?? 21,
      secure: false,
    });

    const remotePath = env.FTP_REMOTE_PATH || '/public_html/downloads';
    await client.cd(remotePath);
    const list = await client.list();
    client.close();

    const files = list.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type === 1 ? 'file' : 'directory',
      modified: f.modifiedAt?.toISOString(),
    }));

    sendSuccess(res, {
      path: remotePath,
      files_count: files.length,
      files,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    sendError(res, 500, 'FTP_LIST_FAILED', `Erro ao listar FTP: ${errMsg}`);
  }
});

/**
 * POST /health/admin/create-payment
 * Cria um pagamento aprovado para testes (requer admin token via header)
 */
router.post('/admin/create-payment', sensitiveLimiter, requireAdminToken, async (req, res) => {
  const { app_id, email, name, amount = 0 } = req.body;

  if (!app_id || !email) {
    sendError(res, 400, 'INVALID_INPUT', 'app_id e email são obrigatórios');
    return;
  }

  try {
    const paymentId = `ADMIN-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        appId: Number(app_id),
        status: 'approved',
        amount: Number(amount),
        currency: 'BRL',
        payerEmail: email.toLowerCase().trim(),
        payerName: name || 'Admin Test',
      },
    });

    sendSuccess(res, {
      payment_id: payment.id,
      app_id: payment.appId,
      email: payment.payerEmail,
      status: payment.status,
      message: 'Pagamento aprovado criado com sucesso',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    sendError(res, 500, 'CREATE_FAILED', `Erro ao criar pagamento: ${errMsg}`);
  }
});

/**
 * POST /health/admin/clear-licenses
 * Limpa todas as licenças e logs de ativação (CUIDADO!)
 */
router.post('/admin/clear-licenses', sensitiveLimiter, requireAdminToken, async (req, res) => {
  const { app_id } = req.body;

  try {
    const where = app_id ? { appId: Number(app_id) } : {};

    // Deletar logs de ativação primeiro (FK)
    const deletedActivations = await prisma.licenseActivation.deleteMany({ where });

    // Deletar licenças
    const deletedLicenses = await prisma.license.deleteMany({ where });

    sendSuccess(res, {
      message: app_id
        ? `Licenças do app ${app_id} removidas`
        : 'Todas as licenças removidas',
      deleted_licenses: deletedLicenses.count,
      deleted_activations: deletedActivations.count,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    sendError(res, 500, 'CLEAR_FAILED', `Erro ao limpar licenças: ${errMsg}`);
  }
});

export default router;
