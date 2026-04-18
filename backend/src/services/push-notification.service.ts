// src/services/push-notification.service.ts
// Push Notification Service using web-push (VAPID)

import webpush from 'web-push';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

function initWebPush(): void {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    logger.warn('VAPID keys not configured — push notifications disabled');
    return;
  }
  webpush.setVapidDetails(
    env.VAPID_EMAIL,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
}

// Initialize on module load
initWebPush();

export const pushNotificationService = {
  /**
   * Send push notification to a specific user.
   * Silently removes expired/invalid subscriptions.
   */
  async sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      logger.warn('VAPID keys not set — skipping push');
      return;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const payloadStr = JSON.stringify(payload);
    const toDelete: number[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payloadStr,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            toDelete.push(sub.id);
          } else {
            logger.warn({ err, subscriptionId: sub.id }, 'Push send failed');
          }
        }
      }),
    );

    if (toDelete.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: toDelete } } });
    }
  },

  /**
   * Send push notification to all subscribers (or specific user IDs).
   * Ignores individual failures and removes invalid subscriptions.
   */
  async sendPushToAll(payload: PushPayload, userIds?: number[]): Promise<{ sent: number; removed: number }> {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      logger.warn('VAPID keys not set — skipping push');
      return { sent: 0, removed: 0 };
    }

    const where = userIds && userIds.length > 0 ? { userId: { in: userIds } } : {};
    const subscriptions = await prisma.pushSubscription.findMany({ where });

    if (subscriptions.length === 0) return { sent: 0, removed: 0 };

    const payloadStr = JSON.stringify(payload);
    const toDelete: number[] = [];
    let sent = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payloadStr,
          );
          sent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            toDelete.push(sub.id);
          } else {
            logger.warn({ err, subscriptionId: sub.id }, 'Push send failed');
          }
        }
      }),
    );

    if (toDelete.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: toDelete } } });
    }

    logger.info({ sent, removed: toDelete.length }, 'Push broadcast complete');
    return { sent, removed: toDelete.length };
  },

  /**
   * Utility: generate a new VAPID key pair (use only in development).
   */
  generateVapidKeys(): { publicKey: string; privateKey: string } {
    return webpush.generateVAPIDKeys();
  },
};
