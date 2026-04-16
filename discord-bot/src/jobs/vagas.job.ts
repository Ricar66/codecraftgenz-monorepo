import Parser from 'rss-parser';
import { TextChannel } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { vagaEmbed } from '../services/embeds.service';
import { logger } from '../utils/logger';

const parser = new Parser();

type VagaItem = { title: string; link: string; contentSnippet?: string; source: string };

const VAGAS_FEEDS = [
  { url: 'https://programathor.com.br/jobs.rss',                             source: 'ProgramaThor' },
  { url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss', source: 'We Work Remotely' },
  { url: 'https://remoteok.com/remote-dev-jobs.rss',                          source: 'RemoteOK' },
];

// ── Remotive API ──────────────────────────────────────────────────────────────
async function fetchRemotiveVagas(): Promise<VagaItem[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=10');
    if (!res.ok) return [];
    const data = await res.json() as { jobs: any[] };
    return (data.jobs ?? []).map((job: any) => ({
      title: `${job.title} @ ${job.company_name}`,
      link: job.url,
      contentSnippet: job.candidate_required_location
        ? `📍 ${job.candidate_required_location} · ${job.job_type ?? 'Remote'}`
        : job.job_type ?? 'Remote',
      source: 'Remotive',
    }));
  } catch (err) {
    logger.error({ err }, 'Erro ao buscar vagas do Remotive');
    return [];
  }
}

// ── Nerdin scraper ────────────────────────────────────────────────────────────
async function fetchNerdinVagas(): Promise<VagaItem[]> {
  try {
    const res = await fetch('https://www.nerdin.com.br/vagas-desenvolvedor-sistemas.php', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CodeCraftBot/1.0)' },
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Extrai links via onclick
    const urlMatches = [...html.matchAll(/onclick="window\.location\.href='([^']+)'"/g)];
    // Extrai títulos
    const titleMatches = [...html.matchAll(/class="vaga-titulo[^"]*"[^>]*>([^<]+)</g)];
    // Extrai localização/modalidade
    const localMatches = [...html.matchAll(/class="vaga-local[^"]*"[^>]*>([^<]+)</g)];

    const vagas: VagaItem[] = [];
    for (let i = 0; i < Math.min(urlMatches.length, 10); i++) {
      const rawUrl = urlMatches[i][1];
      const title = titleMatches[i]?.[1]?.trim();
      const local = localMatches[i]?.[1]?.trim();

      if (!rawUrl || !title) continue;

      const link = rawUrl.startsWith('http')
        ? rawUrl
        : `https://www.nerdin.com.br/${rawUrl}`;

      vagas.push({
        title,
        link,
        contentSnippet: local ? `📍 ${local}` : '🇧🇷 Brasil',
        source: 'Nerdin',
      });
    }

    return vagas;
  } catch (err) {
    logger.error({ err }, 'Erro ao buscar vagas do Nerdin');
    return [];
  }
}

// ── Job principal ─────────────────────────────────────────────────────────────
export async function runVagasJob() {
  try {
    const enabled = await prisma.botConfig.findUnique({ where: { key: 'vagas_enabled' } });
    if (enabled?.value === 'false') return;

    const channelId = env.DISCORD_CHANNEL_VAGAS;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return;

    // Filtros configuráveis por stack
    const stacksConfig = await prisma.botConfig.findUnique({ where: { key: 'vagas_stacks_filter' } });
    const stacks: string[] = stacksConfig?.value ? JSON.parse(stacksConfig.value) : [];

    // Deduplicação — links postados nas últimas 24h
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
    // 1 por feed RSS (3) + 1 Nerdin + 1 Remotive = 5 vagas/dia
    const MAX_PER_RUN = 5;

    // ── RSS feeds (1 vaga por fonte) ──────────────────────────
    for (const feed of VAGAS_FEEDS) {
      if (posted >= MAX_PER_RUN) break;
      try {
        const parsed = await parser.parseURL(feed.url);

        for (const item of parsed.items.slice(0, 15)) {
          if (posted >= MAX_PER_RUN) break;
          if (!item.link || postedLinks.has(item.link)) continue;

          if (stacks.length > 0) {
            const text = `${item.title} ${item.contentSnippet ?? ''}`.toLowerCase();
            if (!stacks.some(s => text.includes(s.toLowerCase()))) continue;
          }

          const { embed, row } = vagaEmbed({
            title: item.title ?? 'Vaga',
            link: item.link,
            contentSnippet: item.contentSnippet,
            company: feed.source,
          });

          const msg = await channel.send({ embeds: [embed], components: [row] });
          await new Promise(r => setTimeout(r, 1500));

          await prisma.botLog.create({
            data: {
              action: 'vaga_posted',
              status: 'ok',
              channelId,
              messageId: msg.id,
              details: JSON.stringify({ link: item.link, title: item.title, source: feed.source }),
            },
          });

          posted++;
          break; // 1 por fonte RSS
        }
      } catch (err: any) {
        logger.error({ err, feed: feed.url }, 'Erro ao buscar vagas do feed');
      }
    }

    // ── Nerdin scraper (1 vaga BR) ────────────────────────────
    if (posted < MAX_PER_RUN) {
      const nerdinVagas = await fetchNerdinVagas();
      for (const vaga of nerdinVagas) {
        if (posted >= MAX_PER_RUN) break;
        if (postedLinks.has(vaga.link)) continue;

        if (stacks.length > 0) {
          const text = `${vaga.title} ${vaga.contentSnippet ?? ''}`.toLowerCase();
          if (!stacks.some(s => text.includes(s.toLowerCase()))) continue;
        }

        const { embed, row } = vagaEmbed({
          title: vaga.title,
          link: vaga.link,
          contentSnippet: vaga.contentSnippet,
          company: vaga.source,
        });

        const msg = await channel.send({ embeds: [embed], components: [row] });
        await new Promise(r => setTimeout(r, 1500));

        await prisma.botLog.create({
          data: {
            action: 'vaga_posted',
            status: 'ok',
            channelId,
            messageId: msg.id,
            details: JSON.stringify({ link: vaga.link, title: vaga.title, source: vaga.source }),
          },
        });

        posted++;
        break; // 1 vaga do Nerdin por rodada
      }
    }

    // ── Remotive API (1 vaga remota internacional) ────────────
    if (posted < MAX_PER_RUN) {
      const remotiveVagas = await fetchRemotiveVagas();
      for (const vaga of remotiveVagas) {
        if (posted >= MAX_PER_RUN) break;
        if (postedLinks.has(vaga.link)) continue;

        if (stacks.length > 0) {
          const text = `${vaga.title} ${vaga.contentSnippet ?? ''}`.toLowerCase();
          if (!stacks.some(s => text.includes(s.toLowerCase()))) continue;
        }

        const { embed, row } = vagaEmbed({
          title: vaga.title,
          link: vaga.link,
          contentSnippet: vaga.contentSnippet,
          company: vaga.source,
        });

        const msg = await channel.send({ embeds: [embed], components: [row] });
        await new Promise(r => setTimeout(r, 1500));

        await prisma.botLog.create({
          data: {
            action: 'vaga_posted',
            status: 'ok',
            channelId,
            messageId: msg.id,
            details: JSON.stringify({ link: vaga.link, title: vaga.title, source: vaga.source }),
          },
        });

        posted++;
        break; // 1 vaga do Remotive por rodada
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
