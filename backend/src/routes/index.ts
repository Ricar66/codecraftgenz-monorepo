import { Router } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import projectRoutes from './projects.js';
import appRoutes from './apps.js';
import paymentRoutes from './payments.js';
import licenseRoutes from './licenses.js';
import challengeRoutes from './challenges.js';
import crafterRoutes from './crafters.js';
import teamRoutes from './teams.js';
import mentorRoutes from './mentors.js';
import inscricaoRoutes from './inscricoes.js';
import financeRoutes from './finances.js';
import configRoutes from './config.js';
import dashboardRoutes from './dashboard.js';
import feedbackRoutes from './feedbacks.js';

const router = Router();

// Health routes (no prefix for k8s probes)
router.use('/health', healthRoutes);

// API routes (prefixed)
router.use('/api/auth', authRoutes);
router.use('/api/auth/users', userRoutes);
router.use('/api/projetos', projectRoutes);
router.use('/api/apps', appRoutes);
router.use('/api/payments', paymentRoutes);
router.use('/api', licenseRoutes); // Licenses has custom paths
router.use('/api/desafios', challengeRoutes);
router.use('/api/crafters', crafterRoutes);
router.use('/api/ranking', crafterRoutes); // Alias para ranking
router.use('/api/equipes', teamRoutes);
router.use('/api/mentores', mentorRoutes);
router.use('/api/inscricoes', inscricaoRoutes);
router.use('/api/financas', financeRoutes);
router.use('/api/config', configRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/feedbacks', feedbackRoutes);

export default router;
