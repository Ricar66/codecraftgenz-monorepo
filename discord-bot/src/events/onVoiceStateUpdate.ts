import { VoiceState } from 'discord.js';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

// Rastreia quando cada membro entrou no canal de voz
const voiceJoinTimes = new Map<string, number>();

export async function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  const userId = member.id;

  // Entrou em um canal de voz
  if (!oldState.channelId && newState.channelId) {
    voiceJoinTimes.set(userId, Date.now());
    return;
  }

  // Saiu de um canal de voz
  if (oldState.channelId && !newState.channelId) {
    const joinTime = voiceJoinTimes.get(userId);
    if (!joinTime) return;

    voiceJoinTimes.delete(userId);

    const elapsedMs = Date.now() - joinTime;
    const minutes = Math.floor(elapsedMs / 60_000);

    if (minutes < 1) return; // ignorar sessões curtíssimas

    const points = Math.floor(minutes / 60); // +1 ponto por hora completa
    if (points < 1) return;

    try {
      await prisma.memberScore.upsert({
        where: { discordId: userId },
        update: {
          score: { increment: points },
          voiceMinutes: { increment: minutes },
          username: member.user.username,
          displayName: member.displayName,
          lastSeen: new Date(),
          updatedAt: new Date(),
        },
        create: {
          discordId: userId,
          username: member.user.username,
          displayName: member.displayName,
          score: points,
          voiceMinutes: minutes,
          currentRole: 'novato',
          lastSeen: new Date(),
        },
      });

      logger.debug({ userId, minutes, points }, 'Pontuação de voz registrada');
    } catch (err) {
      logger.error({ err, userId }, 'Erro ao registrar pontuação de voz');
    }
  }
}
