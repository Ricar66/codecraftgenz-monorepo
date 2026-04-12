import { TextChannel } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { rankingEmbed } from '../services/embeds.service';
import { logger } from '../utils/logger';

export async function runRankingJob() {
  try {
    const enabled = await prisma.botConfig.findUnique({ where: { key: 'ranking_enabled' } });
    if (enabled?.value === 'false') return;

    const channelId = env.DISCORD_CHANNEL_ANUNCIOS;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return;

    const crafters = await prisma.crafter.findMany({
      orderBy: { pontos: 'desc' },
      take: 10,
      select: { nome: true, pontos: true },
    });

    const embed = rankingEmbed(crafters);
    const msg = await channel.send({ embeds: [embed] });

    await prisma.botLog.create({
      data: {
        action: 'ranking_posted',
        status: 'ok',
        channelId,
        messageId: msg.id,
      },
    });

    await prisma.jobState.upsert({
      where: { jobName: 'ranking' },
      update: { lastRunAt: new Date(), lastSuccess: new Date(), runCount: { increment: 1 } },
      create: { jobName: 'ranking', lastRunAt: new Date(), lastSuccess: new Date(), runCount: 1 },
    });

    logger.info('Ranking semanal postado');
  } catch (err: any) {
    logger.error({ err }, 'Erro no job de ranking');
    await prisma.jobState.upsert({
      where: { jobName: 'ranking' },
      update: { lastRunAt: new Date(), lastError: err.message },
      create: { jobName: 'ranking', lastRunAt: new Date(), lastError: err.message },
    }).catch(() => {});
  }
}
