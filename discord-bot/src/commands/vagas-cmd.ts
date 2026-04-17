import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ColorResolvable } from 'discord.js';
import { prisma } from '../db/prisma';

const GREEN_COLOR = 0x22C55E as ColorResolvable;

export const data = new SlashCommandBuilder()
  .setName('vagas')
  .setDescription('Veja as últimas vagas postadas pelo bot');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const logs = await prisma.botLog.findMany({
    where: { action: 'vaga_posted' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const embed = new EmbedBuilder()
    .setColor(GREEN_COLOR)
    .setTitle('💼 Últimas vagas postadas');

  if (logs.length === 0) {
    embed.setDescription('Nenhuma vaga foi postada ainda. O job roda todos os dias às 10h!');
  } else {
    const lines = logs.map((log, idx) => {
      try {
        const d = JSON.parse(log.details ?? '{}') as { title?: string; link?: string; source?: string };
        if (!d.title || !d.link) return null;
        const source = d.source ? ` _(${d.source})_` : '';
        return `**${idx + 1}.** [${d.title}](${d.link})${source}`;
      } catch {
        return null;
      }
    }).filter(Boolean).join('\n\n');

    embed.setDescription(lines || 'Nenhuma vaga disponível no momento.');
  }

  embed.setFooter({ text: 'Novas vagas são postadas diariamente em #vagas-e-freelas' }).setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
