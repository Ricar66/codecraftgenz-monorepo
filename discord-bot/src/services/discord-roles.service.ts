import { Guild } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export async function assignCrafterRole(discordId: string): Promise<boolean> {
  try {
    const roleId = env.DISCORD_ROLE_CRAFTER;
    if (!roleId) {
      logger.warn('DISCORD_ROLE_CRAFTER não configurado');
      return false;
    }

    const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID) as Guild | undefined;
    if (!guild) {
      logger.warn('Guild não encontrada');
      return false;
    }

    const member = await guild.members.fetch(discordId);
    if (!member) {
      logger.warn({ discordId }, 'Membro não encontrado na guild');
      return false;
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      logger.warn({ roleId }, 'Cargo Crafter não encontrado');
      return false;
    }

    await member.roles.add(role);

    await prisma.discordLink.updateMany({
      where: { discordId },
      data: { crafterRoleAssigned: true },
    });

    await prisma.botLog.create({
      data: {
        action: 'role_assigned',
        status: 'ok',
        discordId,
        details: JSON.stringify({ role: role.name }),
      },
    });

    logger.info({ discordId }, 'Cargo Crafter atribuído');
    return true;
  } catch (err: any) {
    logger.error({ err, discordId }, 'Erro ao atribuir cargo Crafter');
    await prisma.botLog.create({
      data: { action: 'role_assigned', status: 'error', discordId, details: err.message },
    }).catch(() => {});
    return false;
  }
}
