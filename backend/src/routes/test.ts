import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { success, sendError } from '../utils/response.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { licenseService } from '../services/license.service.js';
import { logger } from '../utils/logger.js';
import { env, isProd } from '../config/env.js';
import crypto from 'crypto';

const router = Router();

// Bloquear rotas de teste em produção
const blockInProd = (_req: unknown, res: { status: (code: number) => { json: (data: unknown) => void } }, next: () => void) => {
  if (isProd) {
    return res.status(403).json({ error: 'Rotas de teste bloqueadas em produção' });
  }
  next();
};

/**
 * POST /api/test/mock-approved-payment
 * Cria um pagamento aprovado mockado para testes
 */
router.post('/mock-approved-payment', rateLimiter.sensitive, blockInProd, async (req, res): Promise<void> => {
  try {
    const { app_id, email, amount = 0 } = req.body;

    if (!app_id || !email) {
      sendError(res, 400, 'INVALID_INPUT', 'app_id e email são obrigatórios');
      return;
    }

    const paymentId = `MOCK-${crypto.randomUUID()}`;

    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        appId: Number(app_id),
        status: 'approved',
        amount: Number(amount),
        currency: 'BRL',
        payerEmail: email,
        payerName: 'Test User',
      },
    });

    logger.info({ paymentId, appId: app_id, email }, 'Pagamento mockado criado');

    res.json(success({
      payment_id: payment.id,
      status: payment.status,
      message: 'Pagamento mockado criado com sucesso',
    }));
  } catch (error) {
    logger.error({ error }, 'Erro ao criar pagamento mockado');
    sendError(res, 500, 'ERROR', 'Erro ao criar pagamento mockado');
  }
});

/**
 * POST /api/test/provision-license
 * Provisiona uma licença manualmente para testes
 */
router.post('/provision-license', rateLimiter.sensitive, blockInProd, async (req, res): Promise<void> => {
  try {
    const { app_id, email, user_id } = req.body;

    if (!app_id || !email) {
      sendError(res, 400, 'INVALID_INPUT', 'app_id e email são obrigatórios');
      return;
    }

    const license = await licenseService.provisionLicense(
      Number(app_id),
      email,
      user_id ? Number(user_id) : undefined
    );

    logger.info({ appId: app_id, email }, 'Licença provisionada via teste');

    res.json(success({
      license_id: license.id,
      license_key: license.licenseKey,
      message: 'Licença provisionada com sucesso',
    }));
  } catch (error) {
    logger.error({ error }, 'Erro ao provisionar licença');
    sendError(res, 500, 'ERROR', 'Erro ao provisionar licença');
  }
});

/**
 * POST /api/test/release-license
 * Libera/revoga uma licença para testes
 */
router.post('/release-license', rateLimiter.sensitive, blockInProd, async (req, res): Promise<void> => {
  try {
    const { license_id, email, app_id, hardware_id } = req.body;

    if (license_id) {
      // Deletar por ID
      await prisma.license.delete({
        where: { id: Number(license_id) },
      });
    } else if (email && app_id) {
      // Deletar por email e app
      await prisma.license.deleteMany({
        where: {
          email,
          appId: Number(app_id),
          ...(hardware_id ? { hardwareId: hardware_id } : {}),
        },
      });
    } else {
      sendError(res, 400, 'INVALID_INPUT', 'license_id ou (email + app_id) são obrigatórios');
      return;
    }

    logger.info({ license_id, email, app_id }, 'Licença liberada via teste');

    res.json(success({ message: 'Licença liberada com sucesso' }));
  } catch (error) {
    logger.error({ error }, 'Erro ao liberar licença');
    sendError(res, 500, 'ERROR', 'Erro ao liberar licença');
  }
});

/**
 * POST /api/test/seed-license-row
 * Insere uma linha de licença diretamente para testes
 */
router.post('/seed-license-row', rateLimiter.sensitive, blockInProd, async (req, res): Promise<void> => {
  try {
    const { app_id, email, hardware_id, license_key, user_id, app_name } = req.body;

    if (!app_id || !email) {
      sendError(res, 400, 'INVALID_INPUT', 'app_id e email são obrigatórios');
      return;
    }

    const key = license_key || `TEST-${crypto.randomBytes(16).toString('hex')}`;

    const license = await prisma.license.create({
      data: {
        appId: Number(app_id),
        email,
        hardwareId: hardware_id || null,
        licenseKey: key,
        userId: user_id ? Number(user_id) : null,
        appName: app_name || null,
        activatedAt: hardware_id ? new Date() : null,
      },
    });

    logger.info({ licenseId: license.id, appId: app_id, email }, 'Licença seed criada');

    res.json(success({
      license_id: license.id,
      license_key: license.licenseKey,
      message: 'Licença seed criada com sucesso',
    }));
  } catch (error) {
    logger.error({ error }, 'Erro ao criar licença seed');
    sendError(res, 500, 'ERROR', 'Erro ao criar licença seed');
  }
});

/**
 * GET /api/test/clear-all
 * Limpa todos os dados de teste (apenas em desenvolvimento)
 */
router.get('/clear-all', blockInProd, async (_req, res): Promise<void> => {
  try {
    // Deletar licenças de teste
    const deletedLicenses = await prisma.license.deleteMany({
      where: {
        OR: [
          { licenseKey: { startsWith: 'TEST-' } },
          { licenseKey: { startsWith: 'MOCK-' } },
          { licenseKey: { startsWith: 'LIC-' } },
        ],
      },
    });

    // Deletar pagamentos de teste
    const deletedPayments = await prisma.payment.deleteMany({
      where: {
        OR: [
          { id: { startsWith: 'MOCK-' } },
          { id: { startsWith: 'TEST-' } },
        ],
      },
    });

    res.json(success({
      deleted_licenses: deletedLicenses.count,
      deleted_payments: deletedPayments.count,
      message: 'Dados de teste removidos',
    }));
  } catch (error) {
    logger.error({ error }, 'Erro ao limpar dados de teste');
    sendError(res, 500, 'ERROR', 'Erro ao limpar dados de teste');
  }
});

/**
 * GET /api/test/env
 * Retorna informações do ambiente (apenas em desenvolvimento)
 */
router.get('/env', blockInProd, (_req, res): void => {
  res.json(success({
    node_env: env.NODE_ENV,
    is_prod: isProd,
    database_configured: !!env.DATABASE_URL,
    mp_configured: !!env.MP_ACCESS_TOKEN,
    email_configured: !!(env.EMAIL_USER && env.EMAIL_PASS),
  }));
});

export default router;
