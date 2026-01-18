import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { success } from '../utils/response.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

/**
 * POST /api/feedbacks - Enviar feedback público (formulário de contato)
 * Rate limited para evitar spam
 */
router.post('/', rateLimiter.sensitive, async (req, res): Promise<void> => {
  const { nome, email, mensagem, origem } = req.body;

  // Honeypot check - campos ocultos preenchidos = bot
  if (req.body.website || req.body.phone_number) {
    // Retorna sucesso falso para confundir bots
    res.status(200).json(success({ id: 'honeypot-detected' }));
    return;
  }

  // Validação básica
  if (!nome || !email || !mensagem) {
    res.status(400).json({
      success: false,
      error: 'Nome, email e mensagem são obrigatórios',
    });
    return;
  }

  // Validação de email básica
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      error: 'Email inválido',
    });
    return;
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        rating: 5, // Default para feedback de contato
        comment: JSON.stringify({
          origem: origem || 'site',
          nome,
          email,
          mensagem,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    res.json(success({ id: feedback.id, message: 'Feedback enviado com sucesso' }));
  } catch (error) {
    console.error('Erro ao salvar feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar feedback',
    });
  }
});

/**
 * GET /api/feedbacks/latest - Buscar últimos 5 feedbacks para carrossel
 * Rota pública otimizada para a página inicial
 */
router.get('/latest', async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    // Parse JSON comments e formatar para o frontend
    const parsed = feedbacks.map((f) => {
      try {
        const data = JSON.parse(f.comment || '{}');
        return {
          id: f.id,
          nome: data.nome || 'Anônimo',
          mensagem: data.mensagem || data.comment || f.comment,
          email: data.email,
          origem: data.origem || 'site',
          rating: f.rating,
          data_criacao: f.createdAt,
        };
      } catch {
        return {
          id: f.id,
          nome: 'Anônimo',
          mensagem: f.comment,
          rating: f.rating,
          data_criacao: f.createdAt,
        };
      }
    });

    res.json(success(parsed));
  } catch (error) {
    console.error('Erro ao buscar últimos feedbacks:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar feedbacks',
    });
  }
});

/**
 * GET /api/feedbacks - Buscar feedbacks (admin)
 * Usado para listar feedbacks de contato
 */
router.get('/', async (req, res) => {
  const { limit = '20', origem } = req.query;

  try {
    const feedbacks = await prisma.feedback.findMany({
      where: origem
        ? { comment: { contains: `"origem":"${origem}"` } }
        : undefined,
      take: Math.min(Number(limit), 100),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    // Parse JSON comments
    const parsed = feedbacks.map((f) => {
      try {
        const data = JSON.parse(f.comment || '{}');
        return {
          id: f.id,
          rating: f.rating,
          ...data,
          createdAt: f.createdAt,
        };
      } catch {
        return {
          id: f.id,
          rating: f.rating,
          comment: f.comment,
          createdAt: f.createdAt,
        };
      }
    });

    res.json(success(parsed));
  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar feedbacks',
    });
  }
});

export default router;
