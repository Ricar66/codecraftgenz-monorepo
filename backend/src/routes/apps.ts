import { Router } from 'express';
import { appController } from '../controllers/app.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createAppSchema,
  updateAppSchema,
  appIdSchema,
  feedbackSchema,
  createFromProjectSchema,
} from '../schemas/app.schema.js';

const router = Router();

// Rotas públicas
router.get('/public', appController.getPublic);
router.get('/history', appController.getHistory);
router.get('/:id', validate(appIdSchema), appController.getById);

// Rotas autenticadas
router.get('/mine', authenticate, appController.getMine);

router.post(
  '/:id/feedback',
  authenticate,
  validate(feedbackSchema),
  appController.addFeedback
);

// Rotas admin
router.get('/', authenticate, authorizeAdmin, appController.getAll);

router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validate(createAppSchema),
  appController.create
);

router.post(
  '/from-project/:projectId',
  authenticate,
  authorizeAdmin,
  validate(createFromProjectSchema),
  appController.createFromProject
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(updateAppSchema),
  appController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(appIdSchema),
  appController.delete
);

export default router;
