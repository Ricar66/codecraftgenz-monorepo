import { TextChannel, EmbedBuilder, ColorResolvable } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { rankingEmbed } from '../services/embeds.service';
import { logger } from '../utils/logger';

const GOLD_COLOR = 0xF59E0B as ColorResolvable;

async function buildWeeklyEvolutionEmbed(): Promise<EmbedBuilder | null> {
  try {
    // Buscar todos com snapshot setado e score > snapshot
    const candidates = await prisma.memberScore.findMany({
      where: {
        weeklyScoreSnapshot: { gt: 0 },
      },
      select: {
        discordId: true,
        username: true,
        displayName: true,
        score: true,
        weeklyScoreSnapshot: true,
      },
    });

    const withDelta = candidates
      .map(m => ({ ...m, delta: (m.score ?? 0) - (m.weeklyScoreSnapshot ?? 0) }))
      .filter(m => m.delta > 0)
      .sort((a, b) => b.delta - a.delta);

    if (withDelta.length === 0) return null;

    const top = withDelta[0];
    const embed = new EmbedBuilder()
      .setColor(GOLD_COLOR)
      .setTitle('🌟 Maior evolução da semana')
      .setDescription(
        `<@${top.discordId}> (**${top.displayName ?? top.username}**) teve **+${top.delta} pts** nesta semana!\n` +
        `Continue assim — você está no ritmo certo. 🚀`
      )
      .setFooter({ text: 'Evolução calculada a partir do snapshot do domingo' })
      .setTimestamp();

    return embed;
  } catch (err) {
    logger.warn({ err }, 'Erro ao calcular evolução semanal');
    return null;
  }
}

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

    // Embed adicional: maior evolução da semana
    const evolutionEmbed = await buildWeeklyEvolutionEmbed();
    if (evolutionEmbed) {
      await channel.send({ embeds: [evolutionEmbed] });
    }

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
