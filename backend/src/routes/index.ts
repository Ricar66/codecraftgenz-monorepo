import { Router } from 'express';

console.log('[Routes] Carregando rotas...');

import healthRoutes from './health.js';
console.log('[Routes] ✅ health');
import authRoutes from './auth.js';
console.log('[Routes] ✅ auth');
import userRoutes from './users.js';
console.log('[Routes] ✅ users');
import projectRoutes from './projects.js';
console.log('[Routes] ✅ projects');
import appRoutes from './apps.js';
console.log('[Routes] ✅ apps');
import paymentRoutes from './payments.js';
console.log('[Routes] ✅ payments');
import licenseRoutes from './licenses.js';
console.log('[Routes] ✅ licenses');
import challengeRoutes from './challenges.js';
console.log('[Routes] ✅ challenges');
import crafterRoutes from './crafters.js';
console.log('[Routes] ✅ crafters');
import teamRoutes from './teams.js';
console.log('[Routes] ✅ teams');
import mentorRoutes from './mentors.js';
console.log('[Routes] ✅ mentors');
import inscricaoRoutes from './inscricoes.js';
console.log('[Routes] ✅ inscricoes');
import financeRoutes from './finances.js';
console.log('[Routes] ✅ finances');
import configRoutes from './config.js';
console.log('[Routes] ✅ config');
import dashboardRoutes from './dashboard.js';
console.log('[Routes] ✅ dashboard');
import feedbackRoutes from './feedbacks.js';
console.log('[Routes] ✅ feedbacks');
import downloadRoutes from './downloads.js';
console.log('[Routes] ✅ downloads');
import integrationRoutes from './integrations.js';
console.log('[Routes] ✅ integrations');
import testRoutes from './test.js';
console.log('[Routes] ✅ test');
console.log('[Routes] Todas as rotas carregadas!');

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
router.use('/api/downloads', downloadRoutes);
router.use('/api', integrationRoutes); // Mercado Livre OAuth
router.use('/api/test', testRoutes); // Test routes (blocked in production)

export default router;
