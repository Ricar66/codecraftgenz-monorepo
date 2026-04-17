import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

/**
 * Salva o score atual de cada membro no campo weeklyScoreSnapshot.
 * Roda domingo às 23h50 para permitir cálculo da maior evolução semanal
 * no ranking de segunda-feira.
 */
export async function runWeeklySnapshotJob() {
  try {
    const affected = await prisma.$executeRaw`UPDATE member_scores SET weekly_score_snapshot = score`;

    await prisma.jobState.upsert({
      where: { jobName: 'snapshot' },
      update: { lastRunAt: new Date(), lastSuccess: new Date(), runCount: { increment: 1 } },
      create: { jobName: 'snapshot', lastRunAt: new Date(), lastSuccess: new Date(), runCount: 1 },
    });

    await prisma.botLog.create({
      data: {
        action: 'snapshot_saved',
        status: 'ok',
        details: JSON.stringify({ affected }),
      },
    }).catch(() => {});

    logger.info({ affected }, 'Snapshot semanal salvo');
  } catch (err: any) {
    logger.error({ err }, 'Erro no job de snapshot');
    await prisma.jobState.upsert({
      where: { jobName: 'snapshot' },
      update: { lastRunAt: new Date(), lastError: err.message },
      create: { jobName: 'snapshot', lastRunAt: new Date(), lastError: err.message },
    }).catch(() => {});
  }
}
