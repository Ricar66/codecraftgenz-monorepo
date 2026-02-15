import { Router } from 'express';
import { hubController } from '../controllers/hub.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// GET /api/hub/my-apps - Retorna todos os apps com status de licença do usuário
router.get('/my-apps', authenticate, hubController.getMyApps);

export default router;
