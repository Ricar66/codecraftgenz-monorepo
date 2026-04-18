import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');
const MAX_AGE_DAYS = 7;

function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function getBackupFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `backup_${date}_${time}.json`;
}

function pruneOldBackups(): void {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.startsWith('backup_') && f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(BACKUPS_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        logger.info({ file }, 'Backup antigo removido');
      }
    } catch (err) {
      logger.warn({ err, file }, 'Falha ao remover backup antigo');
    }
  }
}

export async function runBackupJob(): Promise<void> {
  logger.info('Iniciando job de backup...');

  try {
    ensureBackupsDir();

    const [users, apps, desafios, memberScores, botConfigs] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          isGuest: true,
          onboardingCompleted: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.app.findMany(),
      prisma.desafio.findMany(),
      prisma.memberScore.findMany(),
      prisma.botConfig.findMany(),
    ]);

    const backup = {
      date: new Date().toISOString(),
      tables: {
        users,
        apps,
        desafios,
        memberScores,
        botConfigs,
      },
    };

    const filename = getBackupFilename();
    const filePath = path.join(BACKUPS_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8');

    pruneOldBackups();

    logger.info(
      {
        file: filename,
        counts: {
          users: users.length,
          apps: apps.length,
          desafios: desafios.length,
          memberScores: memberScores.length,
          botConfigs: botConfigs.length,
        },
      },
      'Backup concluido com sucesso'
    );
  } catch (err) {
    logger.error({ err }, 'Falha ao executar job de backup');
    throw err;
  }
}
