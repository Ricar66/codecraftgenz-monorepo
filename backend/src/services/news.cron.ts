import cron from 'node-cron';
import { newsService } from './news.service.js';
import { logger } from '../utils/logger.js';

/**
 * Agenda busca de notícias a cada 6 horas
 * Roda também imediatamente na primeira inicialização
 */
export function startNewsCron() {
  // Busca imediatamente ao iniciar (com delay de 10s para DB conectar)
  setTimeout(async () => {
    try {
      const count = await newsService.fetchAndSave();
      logger.info({ count }, '📰 Initial news fetch completed');
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Initial news fetch failed');
    }
  }, 10_000);

  // Agenda a cada 6 horas: 0h, 6h, 12h, 18h
  cron.schedule('0 */6 * * *', async () => {
    try {
      const count = await newsService.fetchAndSave();
      logger.info({ count }, '📰 Scheduled news fetch completed');
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Scheduled news fetch failed');
    }
  });

  logger.info('📰 News cron job scheduled (every 6 hours)');
}
