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

const router = Router();

// Rotas públicas
router.get('/', inscricaoController.getAll);
router.get('/:id', validate(inscricaoIdSchema), inscricaoController.getById);

// Criar inscrição (público)
router.post(
  '/',
  validate(createInscricaoSchema),
  inscricaoController.create
);

// Enviar email de boas-vindas ao candidato (público)
router.post('/welcome', async (req: Request, res: Response) => {
  const { to, nome, from } = req.body;
  if (!to || !nome) {
    return res.status(400).json({ success: false, error: 'Campos "to" e "nome" são obrigatórios' });
  }
  const sent = await emailService.sendWelcomeEmail({ to, nome, from });
  return res.json({ success: sent });
});

// Notificar admin sobre nova inscrição (público)
router.post('/notify', async (req: Request, res: Response) => {
  const { to, subject, nome, email, telefone, rede_social, area_interesse, cidade, estado, mensagem } = req.body;
  if (!to || !nome || !email) {
    return res.status(400).json({ success: false, error: 'Campos "to", "nome" e "email" são obrigatórios' });
  }
  const sent = await emailService.sendAdminNotification({
    to, subject: subject || `Nova inscrição de Crafter: ${nome}`,
    nome, email, telefone, rede_social, area_interesse, cidade, estado, mensagem,
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
