import 'dotenv/config';
import cron from 'node-cron';
import { env } from './config/env';
import { client } from './client';
import { logger } from './utils/logger';
import { prisma } from './db/prisma';
import { onReady } from './events/ready';
import { onGuildMemberAdd } from './events/guildMemberAdd';
import { onInteractionCreate } from './events/interactionCreate';
import { onMessageCreate, onMessageReactionAdd } from './events/onMessageCreate';
import { onVoiceStateUpdate } from './events/onVoiceStateUpdate';
import { createHookApp } from './hooks/webhook';
import { runNewsJob } from './jobs/news.job';
import { runVagasJob } from './jobs/vagas.job';
import { runRankingJob } from './jobs/ranking.job';
import { runPromotionJob } from './jobs/promotion.job';
import * as rankCommand from './commands/rank';
import * as desafiosCommand from './commands/desafios';

// Registrar comandos no client
(client as any).commands.set(rankCommand.data.name, rankCommand);
(client as any).commands.set(desafiosCommand.data.name, desafiosCommand);

// Eventos do Discord
client.once('ready', () => onReady(client));
client.on('guildMemberAdd', onGuildMemberAdd);
client.on('interactionCreate', onInteractionCreate);
client.on('messageCreate', onMessageCreate);
client.on('messageReactionAdd', onMessageReactionAdd);
client.on('voiceStateUpdate', onVoiceStateUpdate);

// Cron jobs
// Notícias: 9h e 18h todos os dias
cron.schedule('0 9,18 * * *', () => {
  logger.info('Executando job de notícias...');
  runNewsJob();
});

// Vagas: 10h diário
cron.schedule('0 10 * * *', () => {
  logger.info('Executando job de vagas...');
  runVagasJob();
});

// Ranking: segunda-feira 12h
cron.schedule('0 12 * * 1', () => {
  logger.info('Executando job de ranking semanal...');
  runRankingJob();
});

// Promoção automática: meia-noite todos os dias
cron.schedule('0 0 * * *', () => {
  logger.info('Executando job de promoção...');
  runPromotionJob();
});

// Webhook server interno (localhost only)
const hookApp = createHookApp();
hookApp.listen(env.INTERNAL_PORT, '127.0.0.1', () => {
  logger.info(`Webhook server rodando em 127.0.0.1:${env.INTERNAL_PORT}`);
});

// Login no Discord
client.login(env.DISCORD_TOKEN).then(() => {
  logger.info('Discord bot conectado');
}).catch(err => {
  logger.fatal({ err }, 'Falha ao conectar ao Discord');
  process.exit(1);
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Encerrando bot...');
  client.destroy();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
