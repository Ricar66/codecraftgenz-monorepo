import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { success, sendError } from '../utils/response.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/proposals - Listar propostas (admin)
 */
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const proposals = await prisma.proposal.findMany({
      where: status ? { status } : undefined,
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
    });
    res.json(success(proposals));
  } catch (error) {
    logger.error({ error }, 'Erro ao buscar propostas');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao buscar propostas');
  }
});

/**
 * GET /api/proposals/:id - Detalhes de uma proposta (admin)
 */
router.get('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const proposal = await prisma.proposal.findUnique({
      where: { id },
    });
    if (!proposal) {
      sendError(res, 404, 'NOT_FOUND', 'Proposta não encontrada');
      return;
    }
    res.json(success(proposal));
  } catch (error) {
    logger.error({ error }, 'Erro ao buscar proposta');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao buscar proposta');
  }
});

/**
 * POST /api/proposals - Enviar proposta (público, rate limited)
 */
router.post('/', rateLimiter.sensitive, async (req, res) => {
  try {
    const { companyName, contactName, email, phone, projectType, budgetRange, description } = req.body;

    if (!companyName || !contactName || !email) {
      sendError(res, 400, 'VALIDATION_ERROR', 'companyName, contactName e email são obrigatórios');
      return;
    }

    const proposal = await prisma.proposal.create({
      data: {
        companyName,
        contactName,
        email,
        phone: phone || null,
        projectType: projectType || 'custom',
        budgetRange: budgetRange || null,
        description: description || null,
      },
    });

    logger.info({ id: proposal.id, email }, 'Nova proposta B2B recebida');
    res.status(201).json(success(proposal));
  } catch (error) {
    logger.error({ error }, 'Erro ao criar proposta');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao processar proposta');
  }
});

/**
 * PUT /api/proposals/:id - Atualizar proposta (admin)
 */
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { status, notes } = req.body;
    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });
    res.json(success(proposal));
  } catch (error: any) {
    if (error?.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Proposta não encontrada');
      return;
    }
    logger.error({ error }, 'Erro ao atualizar proposta');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao atualizar proposta');
  }
});

/**
 * DELETE /api/proposals/:id - Excluir proposta (admin)
 */
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.proposal.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error: any) {
    if (error?.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Proposta não encontrada');
      return;
    }
    logger.error({ error }, 'Erro ao excluir proposta');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao excluir proposta');
  }
});

export default router;
