import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
} from '../schemas/project.schema.js';

const router = Router();

// Rotas públicas
router.get('/', projectController.getAll);
router.get('/column/progresso', projectController.getByStatus);
router.get('/:id', validate(projectIdSchema), projectController.getById);

// Rotas protegidas (admin)
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validate(createProjectSchema),
  projectController.create
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(updateProjectSchema),
  projectController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(projectIdSchema),
  projectController.delete
);

export default router;
