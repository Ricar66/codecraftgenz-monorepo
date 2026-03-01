// src/routes/leads.ts
// Rotas de gestão de leads - admin only

import { Router, Request, Response } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { leadDashboardSchema, leadListSchema, updateLeadStatusSchema } from '../schemas/lead.schema.js';
import { leadService } from '../services/lead.service.js';
import { success, sendPaginated } from '../utils/response.js';

const router = Router();

// Todas as rotas requerem admin
router.use(authenticate, authorizeAdmin);

// GET /api/leads/dashboard - Dados agregados para dashboard
router.get('/dashboard', validate(leadDashboardSchema), async (req: Request, res: Response) => {
  const periodo = (req as any).validated?.query?.periodo || '30d';
  const data = await leadService.getDashboardData(periodo);
  res.json(success(data));
});

// GET /api/leads - Lista paginada com filtros
router.get('/', validate(leadListSchema), async (req: Request, res: Response) => {
  const q = (req as any).validated?.query || {};
  const result = await leadService.getAll(q);
  sendPaginated(res, result.leads, result.page, result.limit, result.total);
});

// PUT /api/leads/:id/status - Atualizar status do lead
router.put('/:id/status', validate(updateLeadStatusSchema), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = (req as any).validated?.body;
  const lead = await leadService.updateStatus(id, status);
  res.json(success(lead));
});

export default router;
