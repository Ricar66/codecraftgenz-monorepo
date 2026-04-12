import Parser from 'rss-parser';
import { TextChannel } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { vagaEmbed } from '../services/embeds.service';
import { logger } from '../utils/logger';

const parser = new Parser();

const VAGAS_FEEDS = [
  { url: 'https://programathor.com.br/jobs.rss', source: 'ProgramaThor' },
];

export async function runVagasJob() {
  try {
    const enabled = await prisma.botConfig.findUnique({ where: { key: 'vagas_enabled' } });
    if (enabled?.value === 'false') return;

    const channelId = env.DISCORD_CHANNEL_VAGAS;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return;

    // Filtros configuráveis
    const stacksConfig = await prisma.botConfig.findUnique({ where: { key: 'vagas_stacks_filter' } });
    const stacks: string[] = stacksConfig?.value ? JSON.parse(stacksConfig.value) : [];

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await prisma.botLog.findMany({
      where: { action: 'vaga_posted', createdAt: { gte: oneDayAgo } },
      select: { details: true },
    });
    const postedLinks = new Set(
      recentLogs.map(l => {
        try { return JSON.parse(l.details ?? '{}').link; } catch { return null; }
      }).filter(Boolean)
    );

    let posted = 0;
    for (const feed of VAGAS_FEEDS) {
      if (posted >= 3) break;
      try {
        const parsed = await parser.parseURL(feed.url);
        const items = parsed.items.slice(0, 10);

        for (const item of items) {
          if (posted >= 3) break;
          if (!item.link || postedLinks.has(item.link)) continue;

          // Filtrar por stack se configurado
          if (stacks.length > 0) {
            const text = `${item.title} ${item.contentSnippet ?? ''}`.toLowerCase();
            if (!stacks.some(s => text.includes(s.toLowerCase()))) continue;
          }

          const embed = vagaEmbed({
            title: item.title ?? 'Vaga',
            link: item.link,
            contentSnippet: item.contentSnippet,
            company: feed.source,
          });

          const msg = await channel.send({ embeds: [embed] });
          await new Promise(r => setTimeout(r, 1500));

          await prisma.botLog.create({
            data: {
              action: 'vaga_posted',
              status: 'ok',
              channelId,
              messageId: msg.id,
              details: JSON.stringify({ link: item.link, title: item.title }),
            },
          });

          posted++;
        }
      } catch (err: any) {
        logger.error({ err, feed: feed.url }, 'Erro ao buscar vagas');
      }
    }

    await prisma.jobState.upsert({
      where: { jobName: 'vagas' },
      update: { lastRunAt: new Date(), lastSuccess: new Date(), runCount: { increment: 1 } },
      create: { jobName: 'vagas', lastRunAt: new Date(), lastSuccess: new Date(), runCount: 1 },
    });

    logger.info({ posted }, 'Job de vagas concluído');
  } catch (err: any) {
    logger.error({ err }, 'Erro no job de vagas');
    await prisma.jobState.upsert({
      where: { jobName: 'vagas' },
      update: { lastRunAt: new Date(), lastError: err.message },
      create: { jobName: 'vagas', lastRunAt: new Date(), lastError: err.message },
    }).catch(() => {});
  }
}
