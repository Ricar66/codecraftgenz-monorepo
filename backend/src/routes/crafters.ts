import { Router } from 'express';
import { crafterController } from '../controllers/crafter.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createCrafterSchema,
  updateCrafterSchema,
  crafterIdSchema,
  updatePointsSchema,
  updateTop3Schema,
} from '../schemas/crafter.schema.js';

const router = Router();

// Rotas públicas
router.get('/', crafterController.getAll);
router.get('/ranking', crafterController.getRanking);
router.get('/top3', crafterController.getTop3);
router.get('/audit', authenticate, authorizeAdmin, crafterController.getAudit);
router.get('/:id', validate(crafterIdSchema), crafterController.getById);

// Rotas admin
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validate(createCrafterSchema),
  crafterController.create
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(updateCrafterSchema),
  crafterController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(crafterIdSchema),
  crafterController.delete
);

router.put(
  '/points/:crafterId',
  authenticate,
  authorizeAdmin,
  validate(updatePointsSchema),
  crafterController.updatePoints
);

router.put(
  '/top3',
  authenticate,
  authorizeAdmin,
  validate(updateTop3Schema),
  crafterController.updateTop3
);

router.put(
  '/filters',
  authenticate,
  authorizeAdmin,
  crafterController.updateFilters
);

export default router;
