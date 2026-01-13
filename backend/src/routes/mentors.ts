import { Router } from 'express';
import { mentorController } from '../controllers/mentor.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createMentorSchema,
  updateMentorSchema,
  mentorIdSchema,
} from '../schemas/mentor.schema.js';

const router = Router();

// Rotas públicas
router.get('/', mentorController.getAll);
router.get('/:id', validate(mentorIdSchema), mentorController.getById);

// Rotas admin
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validate(createMentorSchema),
  mentorController.create
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(updateMentorSchema),
  mentorController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(mentorIdSchema),
  mentorController.delete
);

export default router;
