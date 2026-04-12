import { GuildMember, TextChannel } from 'discord.js';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { welcomeEmbed } from '../services/embeds.service';
import { logger } from '../utils/logger';

export async function onGuildMemberAdd(member: GuildMember) {
  try {
    const welcomeEnabled = await prisma.botConfig.findUnique({ where: { key: 'welcome_enabled' } });
    if (welcomeEnabled?.value === 'false') return;

    const channelId = env.DISCORD_CHANNEL_APRESENTACOES;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return;

    const embed = welcomeEmbed(member.user.username);
    const msg = await channel.send({ embeds: [embed] });

    await prisma.botLog.create({
      data: {
        action: 'welcome_sent',
        status: 'ok',
        channelId,
        messageId: msg.id,
        discordId: member.id,
      },
    });
  } catch (err: any) {
    logger.error({ err }, 'Erro ao enviar boas-vindas');
    await prisma.botLog.create({
      data: { action: 'welcome_sent', status: 'error', details: err.message, discordId: member.id },
    }).catch(() => {});
  }
}
