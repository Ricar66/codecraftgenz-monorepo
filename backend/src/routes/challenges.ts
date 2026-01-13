import { Router } from 'express';
import { challengeController } from '../controllers/challenge.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createChallengeSchema,
  updateChallengeSchema,
  challengeIdSchema,
  submitChallengeSchema,
  reviewSubmissionSchema,
} from '../schemas/challenge.schema.js';

const router = Router();

// Rotas públicas
router.get('/', challengeController.getAll);
router.get('/:id', validate(challengeIdSchema), challengeController.getById);

// Rotas autenticadas
router.post(
  '/:id/inscrever',
  authenticate,
  validate(challengeIdSchema),
  challengeController.subscribe
);

router.post(
  '/:id/entregar',
  authenticate,
  validate(submitChallengeSchema),
  challengeController.submit
);

// Rotas admin
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validate(createChallengeSchema),
  challengeController.create
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(updateChallengeSchema),
  challengeController.update
);

router.put(
  '/:id/visibility',
  authenticate,
  authorizeAdmin,
  validate(challengeIdSchema),
  challengeController.toggleVisibility
);

router.put(
  '/:id/status',
  authenticate,
  authorizeAdmin,
  validate(challengeIdSchema),
  challengeController.updateStatus
);

router.put(
  '/submissions/:id/review',
  authenticate,
  authorizeAdmin,
  validate(reviewSubmissionSchema),
  challengeController.reviewSubmission
);

export default router;
