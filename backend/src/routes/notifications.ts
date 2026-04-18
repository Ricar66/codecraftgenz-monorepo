// src/routes/notifications.ts
// Push Notification routes: subscribe, unsubscribe, send (admin)

import { Router, Request, Response } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { prisma } from '../db/prisma.js';
import { pushNotificationService } from '../services/push-notification.service.js';
import { AppError } from '../utils/AppError.js';
import { success } from '../utils/response.js';

const router = Router();

// POST /api/notifications/subscribe — autenticado
router.post('/subscribe', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { endpoint, keys } = req.body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw AppError.badRequest('endpoint, keys.p256dh e keys.auth são obrigatórios');
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
  });

  res.status(201).json(success({ subscribed: true }));
});

// DELETE /api/notifications/unsubscribe — autenticado
router.delete('/unsubscribe', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { endpoint } = req.body as { endpoint?: string };

  if (!endpoint) {
    throw AppError.badRequest('endpoint é obrigatório');
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId },
  });

  res.json(success({ unsubscribed: true }));
});

// POST /api/notifications/send — autenticado + admin
router.post('/send', authenticate, authorizeAdmin, async (req: Request, res: Response) => {
  const { title, body, url, userIds } = req.body as {
    title?: string;
    body?: string;
    url?: string;
    userIds?: number[];
  };

  if (!title || !body) {
    throw AppError.badRequest('title e body são obrigatórios');
  }

  const result = await pushNotificationService.sendPushToAll(
    { title, body, url: url || '/' },
    userIds,
  );

  res.json(success(result));
});

export default router;
