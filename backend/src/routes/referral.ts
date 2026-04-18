// src/routes/referral.ts
// Rotas do programa de indicação.

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { success, sendError } from '../utils/response.js';
import { referralService } from '../services/referral.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

const useCodeSchema = z.object({
  body: z.object({
    code: z.string().min(4).max(32),
    newUserId: z.number().int().positive(),
  }),
});

/**
 * GET /api/referral/my-code — retorna (ou gera) o código do usuário autenticado.
 */
router.get('/my-code', authenticate, async (req, res) => {
  try {
    const code = await referralService.getOrCreateCode(req.user!.id);
    res.json(success({ code }));
  } catch (error: any) {
    if (error?.code === 'NOT_FOUND') {
      sendError(res, 404, 'NOT_FOUND', 'Usuário não encontrado');
      return;
    }
    logger.error({ error }, 'Erro ao obter código de indicação');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao obter código de indicação');
  }
});

/**
 * GET /api/referral/stats — estatísticas do programa para o usuário autenticado.
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await referralService.getStats(req.user!.id);
    res.json(success(stats));
  } catch (error) {
    logger.error({ error }, 'Erro ao obter estatísticas de indicação');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao obter estatísticas');
  }
});

/**
 * POST /api/referral/use — processa a utilização de um código de indicação.
 * Público: chamado logo após o cadastro para registrar a indicação.
 */
router.post('/use', validate(useCodeSchema), async (req, res) => {
  try {
    const { code, newUserId } = (req as any).validated?.body;
    const result = await referralService.useCode(code, newUserId);

    if (!result.ok) {
      // Falhas de validação de código não são erro 500 — retornam 400 com reason
      const reason = result.reason || 'invalid';
      sendError(res, 400, 'REFERRAL_REJECTED', reason);
      return;
    }

    res.status(201).json(success({ processed: true }));
  } catch (error) {
    logger.error({ error }, 'Erro ao processar código de indicação');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao processar indicação');
  }
});

export default router;
