import { Interaction } from 'discord.js';
import { logger } from '../utils/logger';

export async function onInteractionCreate(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const commands = (interaction.client as any).commands;
  const command = commands?.get(interaction.commandName);

  if (!command) {
    logger.warn(`Comando não encontrado: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err: any) {
    logger.error({ err }, `Erro ao executar comando ${interaction.commandName}`);
    const reply = { content: 'Ocorreu um erro ao executar este comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
