import { Router, Request, Response } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createParceriaSchema,
  updateParceriaStatusSchema,
  parceriaIdSchema,
} from '../schemas/parceria.schema.js';
import { parceriaService } from '../services/parceria.service.js';
import { emailService } from '../services/email.service.js';

const router = Router();

// Públicas
router.get('/', async (req: Request, res: Response) => {
  const { status, search, page, limit } = req.query;
  const result = await parceriaService.getAll({
    status: status as string,
    search: search as string,
    page: Number(page) || 1,
    limit: Number(limit) || 25,
  });
  res.json(result);
});

router.post('/', validate(createParceriaSchema), async (req: Request, res: Response) => {
  const data = (req as any).validated?.body || req.body;
  const parceria = await parceriaService.create(data);
  res.status(201).json({ success: true, data: parceria });
});

// Email de boas-vindas ao parceiro
router.post('/welcome', async (req: Request, res: Response) => {
  const { to, nome, empresa } = req.body;
  if (!to || !nome) {
    return res.status(400).json({ success: false, error: 'Campos "to" e "nome" são obrigatórios' });
  }
  const sent = await emailService.sendPartnerWelcomeEmail({ to, nome, empresa });
  return res.json({ success: sent });
});

// Notificação ao admin
router.post('/notify', async (req: Request, res: Response) => {
  const { to, nomeContato, email, telefone, empresa, cargo, site, tipoParceria, mensagem } = req.body;
  if (!to || !nomeContato || !email) {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando' });
  }
  const sent = await emailService.sendPartnerNotification({
    to,
    subject: `🤝 Nova proposta de parceria: ${empresa || nomeContato}`,
    nomeContato, email, telefone, empresa, cargo, site, tipoParceria, mensagem,
  });
  return res.json({ success: sent });
});

// Admin
router.get('/stats', authenticate, authorizeAdmin, async (_req: Request, res: Response) => {
  const stats = await parceriaService.getStats();
  res.json(stats);
});

router.get('/:id', validate(parceriaIdSchema), async (req: Request, res: Response) => {
  const parceria = await parceriaService.getById(String(req.params.id));
  res.json(parceria);
});

router.patch(
  '/:id/status',
  authenticate,
  authorizeAdmin,
  validate(updateParceriaStatusSchema),
  async (req: Request, res: Response) => {
    const data = (req as any).validated?.body || req.body;
    const updated = await parceriaService.updateStatus(String(req.params.id), data);
    res.json({ success: true, data: updated });
  }
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(parceriaIdSchema),
  async (req: Request, res: Response) => {
    await parceriaService.delete(String(req.params.id));
    res.status(204).send();
  }
);

export default router;
