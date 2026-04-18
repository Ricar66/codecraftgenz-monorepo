// src/jobs/email-drip.job.ts
// Job diário para processar emails de onboarding drip.

import cron from 'node-cron';
import { emailDripService } from '../services/email-drip.service.js';
import { logger } from '../utils/logger.js';

/**
 * Executa o processamento dos drips pendentes uma única vez.
 * Exportada para permitir execução manual (testes / admin).
 */
export async function runEmailDripJob(): Promise<void> {
  try {
    const result = await emailDripService.processEmailDrips();
    logger.info({ result }, '✉️ Email drip job run completed');
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, 'Email drip job run failed');
  }
}

/**
 * Agenda o job para rodar todos os dias às 08:00 (horário do servidor).
 */
export function startEmailDripCron(): void {
  cron.schedule('0 8 * * *', () => {
    void runEmailDripJob();
  });
  logger.info('✉️ Email drip cron scheduled (daily 08:00)');
}
