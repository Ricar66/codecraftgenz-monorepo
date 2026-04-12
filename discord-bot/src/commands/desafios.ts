import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../db/prisma';

export const data = new SlashCommandBuilder()
  .setName('desafios')
  .setDescription('Lista os desafios ativos na plataforma');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const desafios = await (prisma as any).desafio.findMany({
    where: { status: 'active' },
    take: 5,
    select: { titulo: true, dificuldade: true, pontos: true },
  }).catch(() => []);

  const embed = new EmbedBuilder()
    .setColor(0x00E4F2 as any)
    .setTitle('🚀 Desafios Ativos — CodeCraft Gen-Z')
    .setURL('https://codecraftgenz.com.br/desafios');

  if (!desafios.length) {
    embed.setDescription('Nenhum desafio ativo no momento.');
  } else {
    embed.setDescription(
      desafios.map((d: any) => `**${d.titulo}** — ${d.dificuldade} — ${d.pontos ?? 0} pts`).join('\n')
    );
  }

  embed.setFooter({ text: 'Acesse codecraftgenz.com.br para participar!' }).setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
