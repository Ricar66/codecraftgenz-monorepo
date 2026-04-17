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
        'Aqui está como começar e ganhar seus primeiros pontos:\n\n' +
        '📋 **PASSO 1 — Se apresente**\n' +
        '→ Poste em **#apresentações** e ganhe **+3 pts**\n\n' +
        '💬 **PASSO 2 — Participe da comunidade**\n' +
        '→ Converse em **#geral** (+1 pt por mensagem)\n' +
        '→ Ajude em **#code-review** e **#tire-suas-duvidas** (+3 pts cada)\n\n' +
        '🏆 **PASSO 3 — Resolva desafios**\n' +
        '→ Acesse **codecraftgenz.com.br/desafios**\n\n' +
        '🚀 **PASSO 4 — Acesse a plataforma**\n' +
        '→ Crie sua conta em **codecraftgenz.com.br**\n' +
        '→ Conecte seu Discord no perfil para vincular pontuação\n\n' +
        '🎯 **META**: 100 pts = cargo **Crafter** | 500 pts = **Crafter Elite**\n\n' +
        'Use `/meu-rank` para ver sua posição a qualquer momento!'
      )
      .setFooter({ text: 'CodeCraft Gen-Z • Devs que evoluem juntos' })
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
