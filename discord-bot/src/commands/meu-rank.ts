import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ColorResolvable } from 'discord.js';
import { prisma } from '../db/prisma';

const BRAND_COLOR = 0xD12BF2 as ColorResolvable;

const THRESHOLD_CRAFTER = 100;
const THRESHOLD_CRAFTER_ELITE = 500;

const ROLE_LABELS: Record<string, string> = {
  novato: 'Novato',
  crafter: 'Crafter',
  crafter_elite: 'Crafter Elite',
};

function progressBar(current: number, target: number, size = 8): string {
  const pct = Math.max(0, Math.min(1, current / target));
  const filled = Math.round(pct * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

export const data = new SlashCommandBuilder()
  .setName('meu-rank')
  .setDescription('Veja sua pontuação, cargo e progresso na comunidade');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const member = await prisma.memberScore.findUnique({
    where: { discordId: interaction.user.id },
  });

  if (!member) {
    await interaction.editReply({
      content: 'Você ainda não tem pontos registrados. Participe de conversas em #geral, #code-review e #tire-suas-duvidas para começar a pontuar!',
    });
    return;
  }

  // Calcular posição no ranking
  const higherCount = await prisma.memberScore.count({
    where: { score: { gt: member.score } },
  });
  const position = higherCount + 1;
  const totalMembers = await prisma.memberScore.count();

  // Próximo nível
  let nextLabel = '';
  let nextMissing = 0;
  let barCurrent = 0;
  let barTarget = 0;

  if (member.currentRole === 'novato') {
    nextLabel = 'Crafter';
    nextMissing = Math.max(0, THRESHOLD_CRAFTER - member.score);
    barCurrent = member.score;
    barTarget = THRESHOLD_CRAFTER;
  } else if (member.currentRole === 'crafter') {
    nextLabel = 'Crafter Elite';
    nextMissing = Math.max(0, THRESHOLD_CRAFTER_ELITE - member.score);
    barCurrent = member.score - THRESHOLD_CRAFTER;
    barTarget = THRESHOLD_CRAFTER_ELITE - THRESHOLD_CRAFTER;
  } else {
    nextLabel = '';
    nextMissing = 0;
    barCurrent = 1;
    barTarget = 1;
  }

  const voiceHours = Math.floor((member.voiceMinutes ?? 0) / 60);
  const voiceMinutesRem = (member.voiceMinutes ?? 0) % 60;

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`📊 Seu Rank — ${member.displayName ?? member.username}`)
    .addFields(
      { name: '🏅 Sua posição', value: `#${position} de ${totalMembers} membros`, inline: true },
      { name: '⭐ Pontuação', value: `${member.score} pts`, inline: true },
      { name: '💼 Cargo atual', value: ROLE_LABELS[member.currentRole] ?? member.currentRole, inline: true },
    );

  if (nextLabel) {
    embed.addFields({
      name: '📈 Próximo nível',
      value: `${nextMissing} pts faltando para **${nextLabel}**\n${progressBar(barCurrent, barTarget)} ${Math.round((barCurrent / Math.max(1, barTarget)) * 100)}%`,
      inline: false,
    });
  } else {
    embed.addFields({
      name: '📈 Próximo nível',
      value: '🏆 Você chegou ao topo! Cargo máximo alcançado.',
      inline: false,
    });
  }

  embed.addFields(
    { name: '💬 Mensagens', value: `${member.messagesTotal} total (${member.messagesTech} técnicas)`, inline: true },
    { name: '⚡ Reações recebidas', value: `${member.reactionsReceived}`, inline: true },
    { name: '🔥 Streak', value: `${member.streakDays ?? 0} dia${(member.streakDays ?? 0) === 1 ? '' : 's'} consecutivo${(member.streakDays ?? 0) === 1 ? '' : 's'}`, inline: true },
    { name: '🎙️ Tempo em voz', value: `${voiceHours}h ${voiceMinutesRem}m`, inline: true },
  );

  embed.setFooter({ text: 'Use /rank para ver o top 10 da comunidade' }).setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
