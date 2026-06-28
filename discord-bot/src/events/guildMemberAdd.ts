import { GuildMember, TextChannel, EmbedBuilder, ColorResolvable } from 'discord.js';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { welcomeEmbed } from '../services/embeds.service';
import { logger } from '../utils/logger';

const CYAN_COLOR = 0x00E4F2 as ColorResolvable;

async function sendOnboardingDM(member: GuildMember) {
  try {
    const cfg = await prisma.botConfig.findUnique({ where: { key: 'dm_onboarding_enabled' } });
    if (cfg?.value === 'false') return; // default habilitado

    const embed = new EmbedBuilder()
      .setColor(CYAN_COLOR)
      .setTitle('👋 Bem-vindo(a) à CodeCraft Gen-Z!')
      .setDescription(
        'Que bom ter você por aqui! Aproveite o servidor:\n\n' +
        '📋 **Se apresente** em **#apresentações**\n' +
        '💬 **Converse** em **#geral**\n' +
        '🆘 **Tire dúvidas** em **#tire-suas-duvidas**\n' +
        '🔍 **Code review** em **#code-review**\n' +
        '📰 **Acompanhe novidades** em **#noticias-tech**\n' +
        '💼 **Vagas e freelas** em **#vagas-e-freelas**\n\n' +
        '🌐 Conheça também nosso site: **codecraftgenz.com.br**'
      )
      .setFooter({ text: 'CodeCraft Gen-Z • Software de verdade, do briefing ao deploy' })
      .setTimestamp();

    await member.send({ embeds: [embed] });

    await prisma.botLog.create({
      data: { action: 'onboarding_dm_sent', status: 'ok', discordId: member.id },
    }).catch(() => {});
  } catch (err: any) {
    // Silenciar — provavelmente DM desativada pelo usuário
    await prisma.botLog.create({
      data: { action: 'onboarding_dm_sent', status: 'skipped', discordId: member.id, details: err?.message ?? 'unknown' },
    }).catch(() => {});
  }
}

export async function onGuildMemberAdd(member: GuildMember) {
  // Atribuir cargo Novato automaticamente
  const novatoRoleId = env.DISCORD_ROLE_NOVATO;
  if (novatoRoleId) {
    try {
      const novatoRole = member.guild.roles.cache.get(novatoRoleId);
      if (novatoRole) {
        await member.roles.add(novatoRole);
        logger.info({ discordId: member.id }, 'Cargo Novato atribuído');
      } else {
        logger.warn({ novatoRoleId }, 'Cargo Novato não encontrado na guild');
      }
    } catch (err: any) {
      logger.error({ err, discordId: member.id }, 'Erro ao atribuir cargo Novato');
    }
  }

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

    // DM de onboarding guiado
    await sendOnboardingDM(member);
  } catch (err: any) {
    logger.error({ err }, 'Erro ao enviar boas-vindas');
    await prisma.botLog.create({
      data: { action: 'welcome_sent', status: 'error', details: err.message, discordId: member.id },
    }).catch(() => {});
  }
}
