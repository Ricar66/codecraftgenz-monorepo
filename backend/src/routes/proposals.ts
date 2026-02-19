import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { success, sendError } from '../utils/response.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/proposals/stats - Estatisticas de propostas (admin)
 * Deve ficar ANTES de /:id para nao conflitar
 */
router.get('/stats', authenticate, authorizeAdmin, async (_req, res) => {
  try {
    const [total, byStatusRaw] = await Promise.all([
      prisma.proposal.count(),
      prisma.proposal.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const s of byStatusRaw) {
      byStatus[s.status] = s._count;
    }

    const approved = byStatus['approved'] || 0;
    const conversionRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0';

    res.json(success({ total, byStatus, conversionRate }));
  } catch (error) {
    logger.error({ error }, 'Erro ao buscar estatisticas de propostas');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao buscar estatisticas');
  }
});

/**
 * GET /api/proposals - Listar propostas com paginacao (admin)
 * Retorna { proposals: [...], pagination: {...} }
 */
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.proposal.count({ where }),
    ]);

    res.json(success({
      proposals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }));
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
    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) {
      sendError(res, 404, 'NOT_FOUND', 'Proposta nao encontrada');
      return;
    }
    res.json(success(proposal));
  } catch (error) {
    logger.error({ error }, 'Erro ao buscar proposta');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao buscar proposta');
  }
});

/**
 * POST /api/proposals - Enviar proposta (publico, rate limited)
 */
router.post('/', rateLimiter.sensitive, async (req, res) => {
  try {
    const { companyName, contactName, email, phone, projectType, budgetRange, description } = req.body;

    if (!companyName || !contactName || !email) {
      sendError(res, 400, 'VALIDATION_ERROR', 'companyName, contactName e email sao obrigatorios');
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
 * PATCH /api/proposals/:id/status - Atualizar apenas status (admin)
 */
router.patch('/:id/status', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { status, notes } = req.body;

    if (!status) {
      sendError(res, 400, 'VALIDATION_ERROR', 'status e obrigatorio');
      return;
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: { status, ...(notes !== undefined ? { notes } : {}) },
    });
    res.json(success(proposal));
  } catch (error: any) {
    if (error?.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Proposta nao encontrada');
      return;
    }
    logger.error({ error }, 'Erro ao atualizar status');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao atualizar status');
  }
});

/**
 * PUT /api/proposals/:id - Atualizar proposta completa (admin)
 */
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { status, notes, companyName, contactName, email, phone, projectType, budgetRange, description } = req.body;
    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(companyName ? { companyName } : {}),
        ...(contactName ? { contactName } : {}),
        ...(email ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(projectType ? { projectType } : {}),
        ...(budgetRange !== undefined ? { budgetRange } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });
    res.json(success(proposal));
  } catch (error: any) {
    if (error?.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Proposta nao encontrada');
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
    await prisma.proposal.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    if (error?.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Proposta nao encontrada');
      return;
    }
    logger.error({ error }, 'Erro ao excluir proposta');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao excluir proposta');
  }
});

export default router;
