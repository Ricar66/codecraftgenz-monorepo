import { Router, Request, Response } from 'express';
import { inscricaoController } from '../controllers/inscricao.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createInscricaoSchema,
  updateInscricaoStatusSchema,
  inscricaoIdSchema,
} from '../schemas/inscricao.schema.js';
import { emailService } from '../services/email.service.js';
import { emailLimiter } from '../middlewares/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Destino fixo para notificações admin — não permite override
const ADMIN_EMAIL = 'codecraftgenz@gmail.com';

// Listagem restrita a admin (contém PII: nome, email, telefone)
router.get('/', authenticate, authorizeAdmin, inscricaoController.getAll);
router.get('/:id', authenticate, authorizeAdmin, validate(inscricaoIdSchema), inscricaoController.getById);

// Criar inscrição (público)
router.post(
  '/',
  validate(createInscricaoSchema),
  inscricaoController.create
);

// Enviar email de boas-vindas ao candidato
// Rate limit: 3 por hora por IP — previne spam
router.post('/welcome', emailLimiter, async (req: Request, res: Response) => {
  const { to, nome } = req.body;

  // Validação básica
  if (!to || !nome || typeof to !== 'string' || typeof nome !== 'string') {
    return res.status(400).json({ success: false, error: 'Campos inválidos' });
  }

  // Validação de formato de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ success: false, error: 'Email inválido' });
  }

  // Limita tamanho para evitar abuse
  if (nome.length > 128 || to.length > 256) {
    return res.status(400).json({ success: false, error: 'Dados muito longos' });
  }

  const sent = await emailService.sendWelcomeEmail({ to, nome });
  if (!sent) logger.warn({ to, ip: req.ip }, 'Welcome email failed');
  return res.json({ success: sent });
});

// Notificar admin sobre nova inscrição
// Rate limit: 3 por hora por IP — previne spam
// Destino fixo: ADMIN_EMAIL — não permite enviar para qualquer email
router.post('/notify', emailLimiter, async (req: Request, res: Response) => {
  const { nome, email, telefone, rede_social, area_interesse, cidade, estado, mensagem } = req.body;

  if (!nome || !email || typeof nome !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Email inválido' });
  }

  // Destino SEMPRE fixo — ignora campo "to" do body
  const sent = await emailService.sendAdminNotification({
    to: ADMIN_EMAIL,
    subject: `Nova inscrição de Crafter: ${String(nome).slice(0, 64)}`,
    nome: String(nome).slice(0, 128),
    email: String(email).slice(0, 256),
    telefone: telefone ? String(telefone).slice(0, 20) : undefined,
    rede_social: rede_social ? String(rede_social).slice(0, 500) : undefined,
    area_interesse: area_interesse ? String(area_interesse).slice(0, 100) : undefined,
    cidade: cidade ? String(cidade).slice(0, 100) : undefined,
    estado: estado ? String(estado).slice(0, 2) : undefined,
    mensagem: mensagem ? String(mensagem).slice(0, 2000) : undefined,
  });

  return res.json({ success: sent });
});

// Rotas admin
router.put(
  '/:id/status',
  authenticate,
  authorizeAdmin,
  validate(updateInscricaoStatusSchema),
  inscricaoController.updateStatus
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(inscricaoIdSchema),
  inscricaoController.delete
);

export default router;
