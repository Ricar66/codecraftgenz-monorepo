// src/routes/ideias.ts
// Rotas do sistema de ideias / votacao

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { success, sendError } from '../utils/response.js';
import { ideiaService } from '../services/ideia.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Todas as rotas requerem autenticacao
router.use(authenticate);

// ---- Schemas de validacao ----

const createIdeiaSchema = z.object({
  body: z.object({
    titulo: z.string().min(3, 'Titulo deve ter pelo menos 3 caracteres').max(256),
    descricao: z.string().min(10, 'Descricao deve ter pelo menos 10 caracteres'),
  }),
});

const addCommentSchema = z.object({
  body: z.object({
    texto: z.string().min(1, 'Texto do comentario e obrigatorio'),
  }),
});

// ---- Rotas ----

/**
 * GET /api/ideias - Lista todas as ideias com comentarios
 */
router.get('/', async (_req, res) => {
  try {
    const ideias = await ideiaService.getAll();
    res.json(success(ideias));
  } catch (error) {
    logger.error({ error }, 'Erro ao listar ideias');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao buscar ideias');
  }
});

/**
 * POST /api/ideias - Criar nova ideia
 */
router.post('/', validate(createIdeiaSchema), async (req, res) => {
  try {
    const { titulo, descricao } = (req as any).validated?.body;
    const user = req.user!;
    const ideia = await ideiaService.create({ titulo, descricao }, { id: user.id, name: user.name });
    res.status(201).json(success(ideia));
  } catch (error) {
    logger.error({ error }, 'Erro ao criar ideia');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao criar ideia');
  }
});

/**
 * POST /api/ideias/:id/vote - Votar em uma ideia
 */
router.post('/:id/vote', async (req, res) => {
  try {
    const ideiaId = Number(req.params.id);
    if (isNaN(ideiaId)) {
      sendError(res, 400, 'VALIDATION_ERROR', 'ID invalido');
      return;
    }

    const result = await ideiaService.vote(ideiaId, req.user!.id);
    res.json(success(result));
  } catch (error: any) {
    if (error?.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Ideia nao encontrada');
      return;
    }
    logger.error({ error }, 'Erro ao votar na ideia');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao registrar voto');
  }
});

/**
 * POST /api/ideias/:id/comment - Adicionar comentario em uma ideia
 */
router.post('/:id/comment', validate(addCommentSchema), async (req, res) => {
  try {
    const ideiaId = Number(req.params.id);
    if (isNaN(ideiaId)) {
      sendError(res, 400, 'VALIDATION_ERROR', 'ID invalido');
      return;
    }

    const { texto } = (req as any).validated?.body;
    const user = req.user!;
    const comentario = await ideiaService.addComment(ideiaId, { texto }, { id: user.id, name: user.name });

    if (!comentario) {
      sendError(res, 404, 'NOT_FOUND', 'Ideia nao encontrada');
      return;
    }

    res.status(201).json(success(comentario));
  } catch (error) {
    logger.error({ error }, 'Erro ao adicionar comentario');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao adicionar comentario');
  }
});

export default router;
