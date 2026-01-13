import { Router } from 'express';
import { inscricaoController } from '../controllers/inscricao.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createInscricaoSchema,
  updateInscricaoStatusSchema,
  inscricaoIdSchema,
} from '../schemas/inscricao.schema.js';

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
