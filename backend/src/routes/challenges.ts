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
  submitRepoSchema,
  listSubmissionsQuerySchema,
  reviewRepoSubmissionSchema,
} from '../schemas/challenge.schema.js';

const router = Router();

// Rotas públicas
router.get('/', challengeController.getAll);

// =============================================================
// Submissões (admin) — DEVEM vir ANTES das rotas /:id/*
// para evitar colisão com parâmetro dinâmico
// =============================================================
router.get(
  '/submissions',
  authenticate,
  authorizeAdmin,
  validate(listSubmissionsQuerySchema),
  challengeController.listSubmissions
);

router.patch(
  '/submissions/:submissionId',
  authenticate,
  authorizeAdmin,
  validate(reviewRepoSubmissionSchema),
  challengeController.reviewRepoSubmission
);

// =============================================================
// Rotas com :id (desafio)
// =============================================================

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

// Novo fluxo: submissão por URL de repositório
router.post(
  '/:id/submit',
  authenticate,
  validate(submitRepoSchema),
  challengeController.submitRepo
);

router.get(
  '/:id/my-submission',
  authenticate,
  validate(challengeIdSchema),
  challengeController.getMySubmission
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

// Review (legacy: score 0-100) mantido para compatibilidade
router.put(
  '/submissions/:id/review',
  authenticate,
  authorizeAdmin,
  validate(reviewSubmissionSchema),
  challengeController.reviewSubmission
);

export default router;
