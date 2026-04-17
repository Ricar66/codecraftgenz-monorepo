import { TextChannel, EmbedBuilder, ColorResolvable } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

const CYAN_COLOR = 0x00E4F2 as ColorResolvable;

const DIFFICULTY_EMOJI: Record<string, string> = {
  facil: '🟢',
  easy: '🟢',
  medio: '🟡',
  médio: '🟡',
  medium: '🟡',
  dificil: '🔴',
  difícil: '🔴',
  hard: '🔴',
};

function emojiForDifficulty(diff?: string): string {
  if (!diff) return '🎯';
  const key = diff.toLowerCase().trim();
  return DIFFICULTY_EMOJI[key] ?? '🎯';
}

async function fetchActiveChallenges(): Promise<any[]> {
  try {
    const res = await fetch('http://127.0.0.1:8080/api/desafios?status=ativo&limit=10', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.desafios)) return data.desafios;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch (err) {
    logger.warn({ err }, 'Não foi possível buscar desafios do backend — usando fallback');
    return [];
  }
}

export async function runDesafioSemanalJob() {
  try {
    const enabled = await prisma.botConfig.findUnique({ where: { key: 'desafio_semanal_enabled' } });
    if (enabled?.value === 'false') return;

    const channelId = env.DISCORD_CHANNEL_DESAFIOS;
    if (!channelId) {
      logger.warn('DISCORD_CHANNEL_DESAFIOS não configurado');
      return;
    }

    const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      logger.warn({ channelId }, 'Canal de desafios não encontrado no cache');
      return;
    }

    // Evitar duplicidade: se postou nos últimos 6 dias, pula
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const recent = await prisma.botLog.findFirst({
      where: { action: 'desafio_semanal_posted', createdAt: { gte: sixDaysAgo } },
    });
    if (recent) {
      logger.info('Desafio semanal já postado nesta semana — pulando');
      return;
    }

    const desafios = await fetchActiveChallenges();

    let embed: EmbedBuilder;

    if (desafios.length > 0) {
      // Sorteia aleatoriamente entre os ativos
      const selected = desafios[Math.floor(Math.random() * desafios.length)];
      const nome = selected.name ?? selected.nome ?? selected.titulo ?? 'Desafio';
      const dificuldade = selected.difficulty ?? selected.dificuldade ?? 'medio';
      const pontos = selected.basePoints ?? selected.pontos ?? selected.reward ?? 100;
      const descricao = (selected.description ?? selected.descricao ?? selected.objective ?? '').toString().slice(0, 300);

      const diffEmoji = emojiForDifficulty(dificuldade);

      embed = new EmbedBuilder()
        .setColor(CYAN_COLOR)
        .setTitle(`🎯 Desafio da Semana — ${nome}`)
        .setURL('https://codecraftgenz.com.br/desafios')
        .addFields(
          { name: 'Dificuldade', value: `${diffEmoji} ${dificuldade}`, inline: true },
          { name: 'Recompensa', value: `⭐ ${pontos} pts`, inline: true },
        )
        .setDescription(
          (descricao || 'Novo desafio para você colocar a mão na massa!') +
          '\n\n**Prazo:** até domingo!\n**Link:** https://codecraftgenz.com.br/desafios'
        )
        .setFooter({ text: 'Resolva o desafio na plataforma para ganhar pontos!' })
        .setTimestamp();
    } else {
      // Fallback
      embed = new EmbedBuilder()
        .setColor(CYAN_COLOR)
        .setTitle('🎯 Desafio da Semana')
        .setURL('https://codecraftgenz.com.br/desafios')
        .setDescription(
          'Acesse **codecraftgenz.com.br/desafios** e escolha um desafio para resolver esta semana!\n\n' +
          '**Prazo:** até domingo!'
        )
        .setFooter({ text: 'Resolva o desafio na plataforma para ganhar pontos!' })
        .setTimestamp();
    }

    const msg = await channel.send({ embeds: [embed] });

    await prisma.botLog.create({
      data: {
        action: 'desafio_semanal_posted',
        status: 'ok',
        channelId,
        messageId: msg.id,
      },
    });

    await prisma.jobState.upsert({
      where: { jobName: 'desafio-semanal' },
      update: { lastRunAt: new Date(), lastSuccess: new Date(), runCount: { increment: 1 } },
      create: { jobName: 'desafio-semanal', lastRunAt: new Date(), lastSuccess: new Date(), runCount: 1 },
    });

    logger.info('Desafio da semana postado');
  } catch (err: any) {
    logger.error({ err }, 'Erro no job de desafio semanal');
    await prisma.jobState.upsert({
      where: { jobName: 'desafio-semanal' },
      update: { lastRunAt: new Date(), lastError: err.message },
      create: { jobName: 'desafio-semanal', lastRunAt: new Date(), lastError: err.message },
    }).catch(() => {});
  }
}
