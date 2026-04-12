import Parser from 'rss-parser';
import { TextChannel } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { newsEmbed } from '../services/embeds.service';
import { logger } from '../utils/logger';

const parser = new Parser();

const NEWS_FEEDS = [
  { url: 'https://www.tabnews.com.br/rss', source: 'TabNews' },
  { url: 'https://dev.to/feed/tag/portuguese', source: 'dev.to' },
];

export async function runNewsJob() {
  try {
    const enabled = await prisma.botConfig.findUnique({ where: { key: 'news_enabled' } });
    if (enabled?.value === 'false') return;

    const channelId = env.DISCORD_CHANNEL_NEWS;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return;

    // Buscar itens já postados (último dia)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await prisma.botLog.findMany({
      where: { action: 'news_posted', createdAt: { gte: oneDayAgo } },
      select: { details: true },
    });
    const postedLinks = new Set(
      recentLogs.map(l => {
        try { return JSON.parse(l.details ?? '{}').link; } catch { return null; }
      }).filter(Boolean)
    );

    let posted = 0;
    for (const feed of NEWS_FEEDS) {
      if (posted >= 2) break;
      try {
        const parsed = await parser.parseURL(feed.url);
        const items = parsed.items.slice(0, 5);

        for (const item of items) {
          if (posted >= 2) break;
          if (!item.link || postedLinks.has(item.link)) continue;

          const embed = newsEmbed({
            title: item.title ?? 'Sem título',
            link: item.link,
            contentSnippet: item.contentSnippet,
            source: feed.source,
          });

          const msg = await channel.send({ embeds: [embed] });
          await new Promise(r => setTimeout(r, 1500)); // evitar rate limit

          await prisma.botLog.create({
            data: {
              action: 'news_posted',
              status: 'ok',
              channelId,
              messageId: msg.id,
              details: JSON.stringify({ link: item.link, title: item.title, source: feed.source }),
            },
          });

          posted++;
        }
      } catch (err: any) {
        logger.error({ err, feed: feed.url }, 'Erro ao buscar feed de notícias');
      }
    }

    await prisma.jobState.upsert({
      where: { jobName: 'news' },
      update: { lastRunAt: new Date(), lastSuccess: new Date(), runCount: { increment: 1 } },
      create: { jobName: 'news', lastRunAt: new Date(), lastSuccess: new Date(), runCount: 1 },
    });

    logger.info({ posted }, 'Job de notícias concluído');
  } catch (err: any) {
    logger.error({ err }, 'Erro no job de notícias');
    await prisma.jobState.upsert({
      where: { jobName: 'news' },
      update: { lastRunAt: new Date(), lastError: err.message },
      create: { jobName: 'news', lastRunAt: new Date(), lastError: err.message },
    }).catch(() => {});
  }
}
