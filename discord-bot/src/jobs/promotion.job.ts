import { Guild, GuildMember } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

const THRESHOLD_CRAFTER       = 100;  // Novato → Crafter
const THRESHOLD_CRAFTER_ELITE = 500;  // Crafter → Crafter Elite

export async function runPromotionJob() {
  try {
    const guildId = env.DISCORD_GUILD_ID;
    const guild = client.guilds.cache.get(guildId) as Guild | undefined;
    if (!guild) {
      logger.warn('Guild não encontrada no cache — promoção ignorada');
      return;
    }

    const roleNovato       = env.DISCORD_ROLE_NOVATO        ? guild.roles.cache.get(env.DISCORD_ROLE_NOVATO)        : undefined;
    const roleCrafter      = env.DISCORD_ROLE_CRAFTER       ? guild.roles.cache.get(env.DISCORD_ROLE_CRAFTER)       : undefined;
    const roleCrafterElite = env.DISCORD_ROLE_CRAFTER_ELITE ? guild.roles.cache.get(env.DISCORD_ROLE_CRAFTER_ELITE) : undefined;

    // Candidatos à promoção: score >= threshold e currentRole ainda não atualizado
    const candidates = await prisma.memberScore.findMany({
      where: {
        OR: [
          { score: { gte: THRESHOLD_CRAFTER_ELITE }, currentRole: { not: 'crafter_elite' } },
          { score: { gte: THRESHOLD_CRAFTER,        lt: THRESHOLD_CRAFTER_ELITE }, currentRole: 'novato' },
        ],
      },
    });

    let promoted = 0;

    for (const member of candidates) {
      let discordMember: GuildMember | undefined;
      try {
        discordMember = await guild.members.fetch(member.discordId);
      } catch {
        continue; // membro saiu do servidor
      }

      const targetRole = member.score >= THRESHOLD_CRAFTER_ELITE ? 'crafter_elite' : 'crafter';
      const targetDiscordRole = targetRole === 'crafter_elite' ? roleCrafterElite : roleCrafter;
      const removeRole = targetRole === 'crafter_elite' ? roleCrafter : roleNovato;

      if (!targetDiscordRole) {
        logger.warn({ targetRole }, 'Cargo de destino não encontrado no env');
        continue;
      }

      try {
        await discordMember.roles.add(targetDiscordRole, 'Promoção automática CodeCraft');

        if (removeRole && discordMember.roles.cache.has(removeRole.id)) {
          await discordMember.roles.remove(removeRole, 'Promoção automática CodeCraft');
        }

        await prisma.memberScore.update({
          where: { discordId: member.discordId },
          data: { currentRole: targetRole, promotedAt: new Date() },
        });

        await prisma.botLog.create({
          data: {
            action: 'member_promoted',
            status: 'ok',
            discordId: member.discordId,
            details: JSON.stringify({
              username: member.username,
              from: member.currentRole,
              to: targetRole,
              score: member.score,
            }),
          },
        });

        logger.info({ discordId: member.discordId, from: member.currentRole, to: targetRole, score: member.score }, 'Membro promovido');
        promoted++;

        // Rate limit
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        logger.error({ err, discordId: member.discordId }, 'Erro ao promover membro');
      }
    }

    await prisma.jobState.upsert({
      where: { jobName: 'promotion' },
      update: { lastRunAt: new Date(), lastSuccess: new Date(), runCount: { increment: 1 } },
      create: { jobName: 'promotion', lastRunAt: new Date(), lastSuccess: new Date(), runCount: 1 },
    });

    logger.info({ promoted }, 'Job de promoção concluído');
  } catch (err: any) {
    logger.error({ err }, 'Erro no job de promoção');
    await prisma.jobState.upsert({
      where: { jobName: 'promotion' },
      update: { lastRunAt: new Date(), lastError: err.message },
      create: { jobName: 'promotion', lastRunAt: new Date(), lastError: err.message },
    }).catch(() => {});
  }
}
