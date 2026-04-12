import { Client } from 'discord.js';
import { logger } from '../utils/logger';

export async function onReady(client: Client) {
  logger.info(`Bot online como ${client.user?.tag}`);
  logger.info(`Servidores: ${client.guilds.cache.size}`);
}
