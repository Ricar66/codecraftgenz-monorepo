import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

// All routes require authentication and admin authorization
router.use(authenticate, authorizeAdmin);

// GET /api/dashboard/stats - Get aggregated dashboard statistics
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/kpis - Get key performance indicators
router.get('/kpis', dashboardController.getKPIs);

// Keep legacy endpoint for backwards compatibility
router.get('/resumo', dashboardController.getStats);

export default router;
