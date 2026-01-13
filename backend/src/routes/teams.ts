import { Router } from 'express';
import { teamController } from '../controllers/team.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createTeamSchema,
  updateTeamSchema,
  teamIdSchema,
  updateTeamStatusSchema,
} from '../schemas/team.schema.js';

const router = Router();

// Rotas públicas
router.get('/', teamController.getAll);
router.get('/:id', validate(teamIdSchema), teamController.getById);

// Rotas admin
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validate(createTeamSchema),
  teamController.create
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(updateTeamSchema),
  teamController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(teamIdSchema),
  teamController.delete
);

router.put(
  '/:id/status',
  authenticate,
  authorizeAdmin,
  validate(updateTeamStatusSchema),
  teamController.updateStatus
);

export default router;
