import express from 'express';
import crypto from 'crypto';
import { TextChannel } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { appEmbed } from '../services/embeds.service';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { runNewsJob } from '../jobs/news.job';
import { runVagasJob } from '../jobs/vagas.job';
import { runEnqueteJob } from '../jobs/enquete.job';

export function createHookApp() {
  const app = express();
  app.use(express.json());

  // Middleware de segurança
  app.use((req, res, next) => {
    const secret = req.headers['x-internal-secret'];
    if (!env.INTERNAL_WEBHOOK_SECRET || !secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(secret as string),
        Buffer.from(env.INTERNAL_WEBHOOK_SECRET)
      );
      if (!valid) return res.status(401).json({ error: 'Unauthorized' });
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // Status do bot
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), ping: client.ws.ping });
  });

  // Novo app
  app.post('/hook/new-app', async (req, res) => {
    try {
      const channelId = env.DISCORD_CHANNEL_ANUNCIOS;
      if (!channelId) return res.json({ success: false, reason: 'channel not configured' });

      const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
      if (!channel) return res.json({ success: false, reason: 'channel not found' });

      const embed = appEmbed(req.body);
      const msg = await channel.send({ embeds: [embed] });

      await prisma.botLog.create({
        data: { action: 'app_posted', status: 'ok', channelId, messageId: msg.id, details: JSON.stringify(req.body) },
      });

      res.json({ success: true });
    } catch (err: any) {
      logger.error({ err }, 'Erro ao postar app');
      res.status(500).json({ error: err.message });
    }
  });

  // Triggers manuais (jobs ativos)
  app.post('/hook/trigger/news', async (_req, res) => {
    runNewsJob().catch(e => logger.error(e));
    res.json({ success: true, message: 'Job de notícias iniciado' });
  });

  app.post('/hook/trigger/vagas', async (_req, res) => {
    runVagasJob().catch(e => logger.error(e));
    res.json({ success: true, message: 'Job de vagas iniciado' });
  });

  app.post('/hook/trigger/enquete', async (_req, res) => {
    runEnqueteJob().catch(e => logger.error(e));
    res.json({ success: true, message: 'Job de enquete iniciado' });
  });

  return app;
}
