import { Router } from 'express';

import healthRoutes from './health.js';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import projectRoutes from './projects.js';
import appRoutes from './apps.js';
import paymentRoutes from './payments.js';
import licenseRoutes from './licenses.js';
import financeRoutes from './finances.js';
import configRoutes from './config.js';
import dashboardRoutes from './dashboard.js';
import proposalRoutes from './proposals.js';
import feedbackRoutes from './feedbacks.js';
import downloadRoutes from './downloads.js';
import uploadRoutes from './uploads.js';
import integrationRoutes from './integrations.js';
import hubRoutes from './hub.js';
import leadRoutes from './leads.js';
import analyticsRoutes from './analytics.js';
import parceriaRoutes from './parcerias.js';
import noticiasRoutes from './noticias.js';
import metaRoutes from './meta.routes.js';
import testRoutes from './test.js';
import discordRoutes from './discord.js';
import referralRoutes from './referral.js';
import backupRoutes from './backup.js';
import notificationRoutes from './notifications.js';
import updatesRoutes from './updates.js';
import panelRoutes from './panel/index.js';
import siteReviewRoutes from './siteReviews.js';

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
router.use('/api/financas', financeRoutes);
router.use('/api/config', configRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/proposals', proposalRoutes);
router.use('/api/feedbacks', feedbackRoutes);
router.use('/api/downloads', downloadRoutes);
router.use('/api/uploads', uploadRoutes);
router.use('/api/hub', hubRoutes); // CodeCraft Hub (desktop launcher)
router.use('/api/leads', leadRoutes);         // Leads Engine
router.use('/api/analytics', analyticsRoutes); // Analytics Events
router.use('/api/parcerias', parceriaRoutes); // Partnerships
router.use('/api/noticias', noticiasRoutes); // News (RSS feeds)
router.use('/api/metas', metaRoutes); // Metas / Goals team calendar
router.use('/api', integrationRoutes); // Mercado Livre OAuth
router.use('/api/discord', discordRoutes); // Discord OAuth + Bot management
router.use('/api/referral', referralRoutes); // Referral program
router.use('/api/test', testRoutes); // Test routes (blocked in production)
router.use('/api/backup', backupRoutes); // Backup status (admin only)
router.use('/api/notifications', notificationRoutes); // Push Notifications (PWA)
router.use('/api/updates', updatesRoutes); // Auto-update manifest universal para apps Tauri/WPF
router.use('/api/panel', panelRoutes); // Painel interno de tarefas/delegação (auth isolada)
router.use('/api/avaliacoes', siteReviewRoutes); // Avaliações públicas do site (com Discord webhook admin)

export default router;
