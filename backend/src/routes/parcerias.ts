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
import { emailLimiter } from '../middlewares/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Destino fixo para notificações admin
const ADMIN_EMAIL = 'codecraftgenz@gmail.com';

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

// Email de boas-vindas ao parceiro — rate limited
router.post('/welcome', emailLimiter, async (req: Request, res: Response) => {
  const { to, nome, empresa } = req.body;

  if (!to || !nome || typeof to !== 'string' || typeof nome !== 'string') {
    return res.status(400).json({ success: false, error: 'Campos inválidos' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ success: false, error: 'Email inválido' });
  }
  if (nome.length > 128 || to.length > 256) {
    return res.status(400).json({ success: false, error: 'Dados muito longos' });
  }

  const sent = await emailService.sendPartnerWelcomeEmail({
    to,
    nome: String(nome).slice(0, 128),
    empresa: empresa ? String(empresa).slice(0, 256) : undefined,
  });
  if (!sent) logger.warn({ to, ip: req.ip }, 'Partner welcome email failed');
  return res.json({ success: sent });
});

// Notificação ao admin — rate limited, destino fixo
router.post('/notify', emailLimiter, async (req: Request, res: Response) => {
  const { nomeContato, email, telefone, empresa, cargo, site, tipoParceria, mensagem } = req.body;

  if (!nomeContato || !email || typeof nomeContato !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Email inválido' });
  }

  // Destino SEMPRE fixo — ignora campo "to" do body
  const sent = await emailService.sendPartnerNotification({
    to: ADMIN_EMAIL,
    subject: `🤝 Nova proposta de parceria: ${String(empresa || nomeContato).slice(0, 64)}`,
    nomeContato: String(nomeContato).slice(0, 128),
    email: String(email).slice(0, 256),
    telefone: telefone ? String(telefone).slice(0, 20) : undefined,
    empresa: empresa ? String(empresa).slice(0, 256) : undefined,
    cargo: cargo ? String(cargo).slice(0, 128) : undefined,
    site: site ? String(site).slice(0, 500) : undefined,
    tipoParceria: tipoParceria ? String(tipoParceria).slice(0, 50) : undefined,
    mensagem: mensagem ? String(mensagem).slice(0, 2000) : undefined,
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
