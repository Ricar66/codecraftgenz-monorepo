import { Message, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from 'discord.js';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

// Canais técnicos — pontuação tripla (+3 por mensagem)
const TECH_CHANNEL_PATTERNS = [
  'tire-suas-duvidas',
  'code-review',
  'mostre-seu-projeto',
  'ferramentas-e-recursos',
  'freela-e-oportunidades',
  'vagas-e-freelas',
  'empreendedorismo',
  'metas-e-progresso',
  'recursos-gratuitos',
  'desafios-codecraft',
  'ideias-de-produto',
  'busco-parceiro',
];

function isTechChannel(channelName: string): boolean {
  const norm = channelName.toLowerCase();
  return TECH_CHANNEL_PATTERNS.some(p => norm.includes(p));
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calcula atualizações de streak a partir do estado atual do membro.
 * - Se a última atividade foi hoje: mantém o streak.
 * - Se foi ontem: incrementa o streak.
 * - Caso contrário: reset para 1.
 * Retorna também bônus em pts quando o streak atinge múltiplos de 7.
 */
function computeStreak(previousDate: Date | null | undefined, previousStreak: number): {
  newStreak: number;
  bonus: number;
  streakLastDate: Date;
} {
  const today = startOfToday();
  if (!previousDate) {
    return { newStreak: 1, bonus: 0, streakLastDate: today };
  }
  const last = new Date(previousDate);
  last.setHours(0, 0, 0, 0);

  if (sameDay(last, today)) {
    return { newStreak: previousStreak || 1, bonus: 0, streakLastDate: today };
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (sameDay(last, yesterday)) {
    const newStreak = (previousStreak || 0) + 1;
    const bonus = newStreak > 0 && newStreak % 7 === 0 ? 10 : 0;
    return { newStreak, bonus, streakLastDate: today };
  }

  // Streak quebrado
  return { newStreak: 1, bonus: 0, streakLastDate: today };
}

// ── Mensagem nova ──────────────────────────────────────────────────────────────
export async function onMessageCreate(message: Message) {
  // Ignorar bots e DMs
  if (message.author.bot || !message.guild) return;

  const isThread = message.channel.isThread();
  const parentChannel = isThread
    ? message.channel.parent
    : message.channel;

  const channelName = (parentChannel as any)?.name ?? '';
  const isTech = isTechChannel(channelName);

  // Pontuação base: thread reply = +2, técnico = +3, geral = +1
  let points = 1;
  if (isThread) points = 2;
  else if (isTech) points = 3;

  try {
    // Buscar estado atual para calcular streak
    const existing = await prisma.memberScore.findUnique({
      where: { discordId: message.author.id },
      select: { streakDays: true, streakLastDate: true },
    });

    // Streak (somente se habilitado)
    const streakCfg = await prisma.botConfig.findUnique({ where: { key: 'streak_enabled' } });
    const streakEnabled = streakCfg?.value !== 'false';

    let streakDays = existing?.streakDays ?? 0;
    let streakLastDate: Date = existing?.streakLastDate ?? startOfToday();
    let bonusPts = 0;

    if (streakEnabled) {
      const result = computeStreak(existing?.streakLastDate ?? null, existing?.streakDays ?? 0);
      streakDays = result.newStreak;
      streakLastDate = result.streakLastDate;
      bonusPts = result.bonus;
    }

    const totalPoints = points + bonusPts;

    await prisma.memberScore.upsert({
      where: { discordId: message.author.id },
      update: {
        score: { increment: totalPoints },
        messagesTotal: { increment: 1 },
        messagesTech: isTech ? { increment: 1 } : undefined,
        threadReplies: isThread ? { increment: 1 } : undefined,
        username: message.author.username,
        displayName: message.member?.displayName ?? message.author.username,
        lastSeen: new Date(),
        streakDays: streakEnabled ? streakDays : undefined,
        streakLastDate: streakEnabled ? streakLastDate : undefined,
        updatedAt: new Date(),
      },
      create: {
        discordId: message.author.id,
        username: message.author.username,
        displayName: message.member?.displayName ?? message.author.username,
        score: totalPoints,
        messagesTotal: 1,
        messagesTech: isTech ? 1 : 0,
        threadReplies: isThread ? 1 : 0,
        currentRole: 'novato',
        streakDays: streakEnabled ? streakDays : 0,
        streakLastDate: streakEnabled ? streakLastDate : null,
        lastSeen: new Date(),
      },
    });

    // Notificar bônus de streak (silenciosamente via log)
    if (bonusPts > 0) {
      await prisma.botLog.create({
        data: {
          action: 'streak_bonus',
          status: 'ok',
          discordId: message.author.id,
          details: JSON.stringify({ streakDays, bonus: bonusPts }),
        },
      }).catch(() => {});
    }
  } catch (err) {
    logger.error({ err, discordId: message.author.id }, 'Erro ao registrar pontuação de mensagem');
  }

  // ── Thread automática em #tire-suas-duvidas ────────────────────────────
  try {
    if (isThread) return;
    if (channelName.toLowerCase() !== 'tire-suas-duvidas') return;
    if (!message.content || message.content.length <= 80) return;

    const cfg = await prisma.botConfig.findUnique({ where: { key: 'auto_thread_enabled' } });
    if (cfg?.value === 'false') return; // default habilitado

    const textChannel = message.channel as TextChannel;
    // Verificar permissão básica antes de tentar
    const name = message.content.slice(0, 80).replace(/\s+/g, ' ').trim() + '...';

    try {
      await textChannel.threads.create({
        name,
        startMessage: message.id,
        autoArchiveDuration: 1440, // 24h
        reason: 'Thread automática em tire-suas-duvidas',
      });
    } catch (err: any) {
      // Silenciar erros de permissão
      if (err?.code === 50013 || /Missing Permissions/i.test(err?.message ?? '')) {
        return;
      }
      logger.warn({ err, messageId: message.id }, 'Erro ao criar thread automática');
    }
  } catch (err) {
    logger.error({ err }, 'Erro no auto-thread');
  }
}

// ── Reação adicionada — pontua o autor da mensagem ─────────────────────────────
export async function onMessageReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
) {
  if (user.bot || !reaction.message.guild) return;

  // Quem recebe a reação é o autor da mensagem
  const authorId = reaction.message.author?.id;
  if (!authorId || authorId === user.id) return; // ignorar auto-reação

  try {
    const authorUser = reaction.message.author!;
    await prisma.memberScore.upsert({
      where: { discordId: authorId },
      update: {
        score: { increment: 2 },
        reactionsReceived: { increment: 1 },
        username: authorUser.username,
        updatedAt: new Date(),
      },
      create: {
        discordId: authorId,
        username: authorUser.username,
        score: 2,
        reactionsReceived: 1,
        currentRole: 'novato',
        lastSeen: new Date(),
      },
    });
  } catch (err) {
    logger.error({ err, authorId }, 'Erro ao registrar pontuação de reação');
  }
}
