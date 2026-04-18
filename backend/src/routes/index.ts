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
import proposalRoutes from './proposals.js';
import feedbackRoutes from './feedbacks.js';
import downloadRoutes from './downloads.js';
import uploadRoutes from './uploads.js';
import integrationRoutes from './integrations.js';
import hubRoutes from './hub.js';
import nfseRoutes from './nfse.js';
import leadRoutes from './leads.js';
import analyticsRoutes from './analytics.js';
import ideiasRoutes from './ideias.js';
import parceriaRoutes from './parcerias.js';
import noticiasRoutes from './noticias.js';
import metaRoutes from './meta.routes.js';
import testRoutes from './test.js';
import discordRoutes from './discord.js';
import referralRoutes from './referral.js';
import backupRoutes from './backup.js';

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
router.use('/api/proposals', proposalRoutes);
router.use('/api/feedbacks', feedbackRoutes);
router.use('/api/downloads', downloadRoutes);
router.use('/api/uploads', uploadRoutes);
router.use('/api/hub', hubRoutes); // CodeCraft Hub (desktop launcher)
router.use('/api/nfse', nfseRoutes); // NFS-e (Nota Fiscal de Servico Eletronica)
router.use('/api/leads', leadRoutes);         // Leads Engine
router.use('/api/analytics', analyticsRoutes); // Analytics Events
router.use('/api/ideias', ideiasRoutes); // Ideas / Voting System
router.use('/api/parcerias', parceriaRoutes); // Partnerships
router.use('/api/noticias', noticiasRoutes); // News (RSS feeds)
router.use('/api/metas', metaRoutes); // Metas / Goals team calendar
router.use('/api', integrationRoutes); // Mercado Livre OAuth
router.use('/api/discord', discordRoutes); // Discord OAuth + Bot management
router.use('/api/referral', referralRoutes); // Referral program
router.use('/api/test', testRoutes); // Test routes (blocked in production)
router.use('/api/backup', backupRoutes); // Backup status (admin only)

export default router;
