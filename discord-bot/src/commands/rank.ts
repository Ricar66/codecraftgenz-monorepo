import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../db/prisma';
import { rankingEmbed } from '../services/embeds.service';

export const data = new SlashCommandBuilder()
  .setName('rank')
  .setDescription('Veja o ranking dos top Crafters da plataforma');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const crafters = await prisma.crafter.findMany({
    orderBy: { pontos: 'desc' },
    take: 10,
    select: { nome: true, pontos: true },
  });

  const embed = rankingEmbed(crafters);
  await interaction.editReply({ embeds: [embed] });
}
