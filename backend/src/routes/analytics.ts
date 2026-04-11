// src/routes/analytics.ts
// Rotas de Analytics — recebe eventos do frontend e expõe APIs de leitura para o painel admin

import { Router } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { success } from '../utils/response.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
// POST /api/analytics/events
// Recebe lote de eventos do frontend (sem autenticação — tracking público).
// Falha silenciosamente para não impactar o usuário.
// ─────────────────────────────────────────────────────────────
router.post('/events', rateLimiter.api, async (req, res) => {
  try {
    const { events } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
      res.json(success({ saved: 0 }));
      return;
    }
    // Limita a 100 eventos por batch para evitar sobrecarga
    const saved = await analyticsService.saveEvents(events.slice(0, 100));
    res.json(success({ saved }));
  } catch (err) {
    // Absorve o erro — tracking não pode quebrar o site
    logger.warn({ err }, 'Analytics: erro ao salvar eventos (absorvido)');
    res.json(success({ saved: 0 }));
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/events
// Lista eventos com filtros (admin apenas)
// Query: limit, offset, category, period, event_name
// ─────────────────────────────────────────────────────────────
router.get('/events', authenticate, authorizeAdmin, async (req, res) => {
  const limit      = Math.min(200, Number(req.query.limit)  || 50);
  const offset     = Math.max(0,   Number(req.query.offset) || 0);
  const category   = req.query.category   as string | undefined;
  const period     = req.query.period     as string | undefined;
  const event_name = req.query.event_name as string | undefined;

  const result = await analyticsService.getEvents({ limit, offset, category, period, event_name });
  res.json(success(result.data));
});

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/funnel
// Dados de funil agrupados por step (admin apenas)
// Query: funnel=purchase_funnel&period=30d
// ─────────────────────────────────────────────────────────────
router.get('/funnel', authenticate, authorizeAdmin, async (req, res) => {
  const funnel = req.query.funnel as string;
  const period = (req.query.period as string) || '30d';

  if (!funnel) {
    res.json(success([]));
    return;
  }

  const steps = await analyticsService.getFunnelData(funnel, period);
  res.json(success(steps));
});

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/summary
// Resumo geral de analytics (admin apenas)
// Query: period=30d
// ─────────────────────────────────────────────────────────────
router.get('/summary', authenticate, authorizeAdmin, async (req, res) => {
  const period = (req.query.period as string) || '30d';
  const summary = await analyticsService.getSummary(period);
  res.json(success(summary));
});

export default router;
