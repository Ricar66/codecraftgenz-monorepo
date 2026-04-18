import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

// All routes require authentication and admin authorization
router.use(authenticate, authorizeAdmin);

// GET /api/backup/status - Lista os arquivos de backup existentes
router.get('/status', (_req, res) => {
  if (!fs.existsSync(BACKUPS_DIR)) {
    sendSuccess(res, { backups: [], backupsDir: BACKUPS_DIR });
    return;
  }

  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
    .map((file) => {
      const filePath = path.join(BACKUPS_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        return {
          name: file,
          sizeBytes: stat.size,
          sizeKB: Math.round(stat.size / 1024),
          createdAt: stat.birthtime,
          modifiedAt: stat.mtime,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (!a || !b) return 0;
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
    });

  sendSuccess(res, { backups: files, backupsDir: BACKUPS_DIR, count: files.length });
});

export default router;
