import { Guild, GuildMember, TextChannel, EmbedBuilder, ColorResolvable } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

const GOLD_COLOR = 0xF59E0B as ColorResolvable;

const ROLE_LABELS: Record<string, string> = {
  novato: 'Novato',
  crafter: 'Crafter',
  crafter_elite: 'Crafter Elite',
};

async function postPromotionAnnouncement(
  guild: Guild,
  discordMember: GuildMember,
  targetRole: string,
  score: number,
) {
  try {
    const cfg = await prisma.botConfig.findUnique({ where: { key: 'promo_announcement_enabled' } });
    if (cfg?.value === 'false') return; // default habilitado

    const channelId = env.DISCORD_CHANNEL_ANUNCIOS;
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return;

    const roleLabel = ROLE_LABELS[targetRole] ?? targetRole;

    const embed = new EmbedBuilder()
      .setColor(GOLD_COLOR)
      .setTitle(`🎉 Parabéns ${discordMember.user.username}!`)
      .setDescription(
        `<@${discordMember.id}> acumulou **${score} pts** e conquistou o cargo **${roleLabel}**!\n` +
        `Continue assim — você está evoluindo de verdade. 🚀\n\n` +
        `▸ Novato → Crafter: 100 pts necessários\n` +
        `▸ Crafter → Crafter Elite: 500 pts necessários`
      )
      .setFooter({ text: 'CodeCraft Gen-Z • Promoção automática' })
      .setTimestamp();

    const msg = await channel.send({ content: `<@${discordMember.id}>`, embeds: [embed] });

    await prisma.botLog.create({
      data: {
        action: 'promotion_announced',
        status: 'ok',
        channelId,
        messageId: msg.id,
        discordId: discordMember.id,
        details: JSON.stringify({ to: targetRole, score }),
      },
    });
  } catch (err: any) {
    logger.error({ err, discordId: discordMember.id }, 'Erro ao postar anúncio de promoção');
  }
}

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

        // Anúncio público de promoção
        await postPromotionAnnouncement(guild, discordMember, targetRole, member.score);

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
