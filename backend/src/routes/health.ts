import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * GET /api/v1/health
 * Basic health check
 */
router.get('/', (req, res) => {
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
router.get('/db', async (req, res) => {
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
router.get('/ready', async (req, res) => {
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
router.get('/live', (req, res) => {
  sendSuccess(res, { status: 'alive' });
});

export default router;
