import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { success } from '../utils/response.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

const TIPOS_VALIDOS = ['elogio', 'sugestao', 'reclamacao', 'duvida'] as const;
type TipoReview = (typeof TIPOS_VALIDOS)[number];

const TIPO_LABEL: Record<TipoReview, string> = {
  elogio: 'Elogio',
  sugestao: 'Sugestão',
  reclamacao: 'Reclamação',
  duvida: 'Dúvida',
};

const TIPO_EMOJI: Record<TipoReview, string> = {
  elogio: '💚',
  sugestao: '💡',
  reclamacao: '⚠️',
  duvida: '❓',
};

const TIPO_COLOR: Record<TipoReview, number> = {
  elogio: 0x22c55e,
  sugestao: 0x6366f1,
  reclamacao: 0xef4444,
  duvida: 0xeab308,
};

/**
 * Posta a nova avaliação num canal admin do Discord via webhook.
 * Configure DISCORD_REVIEWS_WEBHOOK_URL no .env do backend.
 * Falha silenciosa para não bloquear o usuário se o Discord estiver fora.
 */
async function postReviewToDiscord(review: {
  id: number;
  nome: string | null;
  email: string | null;
  tipo: string;
  nota: number;
  mensagem: string;
  ref: string | null;
}) {
  const webhookUrl = process.env.DISCORD_REVIEWS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const tipoKey = (TIPOS_VALIDOS as readonly string[]).includes(review.tipo)
    ? (review.tipo as TipoReview)
    : 'duvida';
  const stars = '⭐'.repeat(Math.max(1, Math.min(5, review.nota)));

  const embed = {
    title: `${TIPO_EMOJI[tipoKey]} Nova avaliação do site — ${TIPO_LABEL[tipoKey]}`,
    description: review.mensagem.slice(0, 1800),
    color: TIPO_COLOR[tipoKey],
    fields: [
      { name: 'Nota', value: `${stars} (${review.nota}/5)`, inline: true },
      { name: 'Origem', value: review.ref || 'direto', inline: true },
      { name: 'Nome', value: review.nome || '—', inline: true },
      { name: 'Email', value: review.email || '—', inline: false },
    ],
    footer: { text: `Avaliação #${review.id} • codecraftgenz.com.br/admin/avaliacoes` },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'Discord webhook (site review) retornou erro');
    }
  } catch (err) {
    logger.warn({ err }, 'Falha ao postar avaliação no Discord (não bloqueante)');
  }
}

/**
 * POST /api/avaliacoes — público, com honeypot e rate limit.
 * Body: { nome?, email?, tipo, nota, mensagem, ref? }
 */
router.post('/', rateLimiter.sensitive, async (req, res): Promise<void> => {
  const { nome, email, tipo, nota, mensagem, ref } = req.body || {};

  // Honeypot anti-bot
  if (req.body?.website || req.body?.phone_number) {
    res.status(200).json(success({ id: 'honeypot-detected' }));
    return;
  }

  // Validações
  if (!tipo || !(TIPOS_VALIDOS as readonly string[]).includes(String(tipo))) {
    res.status(400).json({ success: false, error: 'Tipo de avaliação inválido' });
    return;
  }
  const notaNum = Number(nota);
  if (!Number.isInteger(notaNum) || notaNum < 1 || notaNum > 5) {
    res.status(400).json({ success: false, error: 'Nota deve ser entre 1 e 5' });
    return;
  }
  const msg = typeof mensagem === 'string' ? mensagem.trim() : '';
  if (msg.length < 5 || msg.length > 4000) {
    res.status(400).json({ success: false, error: 'Mensagem deve ter entre 5 e 4000 caracteres' });
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    res.status(400).json({ success: false, error: 'Email inválido' });
    return;
  }

  try {
    const review = await prisma.siteReview.create({
      data: {
        nome: nome ? String(nome).trim().slice(0, 120) : null,
        email: email ? String(email).trim().slice(0, 180) : null,
        tipo: String(tipo),
        nota: notaNum,
        mensagem: msg,
        ref: ref ? String(ref).slice(0, 40) : null,
        ip: req.ip || null,
        userAgent: (req.get('user-agent') || '').slice(0, 255) || null,
      },
    });

    // Discord async (não bloqueia resposta)
    postReviewToDiscord(review).catch(() => {});

    res.json(success({ id: review.id, message: 'Obrigado pela sua avaliação!' }));
  } catch (error) {
    logger.error({ err: error }, 'Erro ao salvar avaliação');
    res.status(500).json({ success: false, error: 'Erro interno ao processar avaliação' });
  }
});

/**
 * GET /api/avaliacoes — admin. Lista com filtros.
 */
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  const { limit = '50', tipo, lida } = req.query;

  try {
    const where: { tipo?: string; lida?: boolean } = {};
    if (tipo && (TIPOS_VALIDOS as readonly string[]).includes(String(tipo))) {
      where.tipo = String(tipo);
    }
    if (lida === 'true') where.lida = true;
    if (lida === 'false') where.lida = false;

    const [items, total, naoLidas] = await Promise.all([
      prisma.siteReview.findMany({
        where,
        take: Math.min(Number(limit) || 50, 200),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.siteReview.count({ where }),
      prisma.siteReview.count({ where: { lida: false } }),
    ]);

    res.json(success({ items, total, naoLidas }));
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar avaliações');
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PATCH /api/avaliacoes/:id — admin. Marcar como lida/não lida.
 */
router.patch('/:id', authenticate, authorizeAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, error: 'ID inválido' });
    return;
  }
  const lida = req.body?.lida;
  if (typeof lida !== 'boolean') {
    res.status(400).json({ success: false, error: 'Campo "lida" deve ser booleano' });
    return;
  }
  try {
    const updated = await prisma.siteReview.update({
      where: { id },
      data: { lida },
    });
    res.json(success(updated));
  } catch (error) {
    logger.error({ err: error, id }, 'Erro ao atualizar avaliação');
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * DELETE /api/avaliacoes/:id — admin. Para spam.
 */
router.delete('/:id', authenticate, authorizeAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, error: 'ID inválido' });
    return;
  }
  try {
    await prisma.siteReview.delete({ where: { id } });
    res.json(success({ id, deleted: true }));
  } catch (error) {
    logger.error({ err: error, id }, 'Erro ao deletar avaliação');
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

export default router;
