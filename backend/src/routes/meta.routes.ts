// src/routes/meta.routes.ts
// Routes for the Metas (Goals) team calendar module.
// Access: roles admin, editor, team

import { Router } from 'express';
import { authenticate, authorize, authorizeAdmin } from '../middlewares/auth.js';
import { metaController } from '../controllers/meta.controller.js';

const router = Router();

const authorizeTeam = authorize('admin', 'editor', 'team');

// ── Team members (assignee picker) ─────────────────────────
router.get('/team-members', authenticate, authorizeTeam, metaController.teamMembers);

// ── Google Calendar integration (admin only) ───────────────
router.get('/google/status', authenticate, authorizeAdmin, metaController.calendarStatus);
router.get('/google/connect-url', authenticate, authorizeAdmin, metaController.calendarConnect);
router.get('/google/callback', metaController.calendarCallback); // No auth — Google redirects here
router.delete('/google/disconnect', authenticate, authorizeAdmin, metaController.calendarDisconnect);

// ── Metas CRUD ─────────────────────────────────────────────
router.get('/', authenticate, authorizeTeam, metaController.list);
router.get('/:id', authenticate, authorizeTeam, metaController.getById);
router.post('/', authenticate, authorizeTeam, metaController.create);
router.put('/:id', authenticate, authorizeTeam, metaController.update);
router.delete('/:id', authenticate, authorizeAdmin, metaController.delete);

// ── Observations ───────────────────────────────────────────
router.post('/:id/observations', authenticate, authorizeTeam, metaController.addObservation);
router.delete('/:id/observations/:obsId', authenticate, authorizeTeam, metaController.deleteObservation);

export default router;
