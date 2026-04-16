import { Message, MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
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

// ── Mensagem nova ──────────────────────────────────────────────────────────────
export async function onMessageCreate(message: Message) {
  // Ignorar bots e DMs
  if (message.author.bot || !message.guild) return;

  const isThread = message.channel.isThread();
  const parentChannel = isThread
    ? message.channel.parent
    : message.channel;

  const channelName = parentChannel?.name ?? (message.channel as any).name ?? '';
  const isTech = isTechChannel(channelName);

  // Pontuação base: thread reply = +2, técnico = +3, geral = +1
  let points = 1;
  if (isThread) points = 2;
  else if (isTech) points = 3;

  try {
    await prisma.memberScore.upsert({
      where: { discordId: message.author.id },
      update: {
        score: { increment: points },
        messagesTotal: { increment: 1 },
        messagesTech: isTech ? { increment: 1 } : undefined,
        threadReplies: isThread ? { increment: 1 } : undefined,
        username: message.author.username,
        displayName: message.member?.displayName ?? message.author.username,
        lastSeen: new Date(),
        updatedAt: new Date(),
      },
      create: {
        discordId: message.author.id,
        username: message.author.username,
        displayName: message.member?.displayName ?? message.author.username,
        score: points,
        messagesTotal: 1,
        messagesTech: isTech ? 1 : 0,
        threadReplies: isThread ? 1 : 0,
        currentRole: 'novato',
        lastSeen: new Date(),
      },
    });
  } catch (err) {
    logger.error({ err, discordId: message.author.id }, 'Erro ao registrar pontuação de mensagem');
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
