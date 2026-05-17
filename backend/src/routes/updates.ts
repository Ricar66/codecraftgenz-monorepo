import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// GET /api/updates/:slug
// Endpoint público de auto-update — formato compatível com Tauri updater v1/v2.
// 204 = sem dados de update (app não cadastrado ou sem versão/url).
router.get('/:slug', rateLimiter.api, async (req: Request, res: Response) => {
  const slugParam = req.params.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug inválido' });
  }

  const app = await prisma.app.findUnique({
    where: { slug },
    select: {
      version: true,
      executableUrl: true,
      changelog: true,
      signature: true,
      releaseDate: true,
    },
  });

  if (!app || !app.version || !app.executableUrl) {
    return res.status(204).send();
  }

  return res.json({
    version: app.version,
    notes: app.changelog ?? '',
    pub_date: (app.releaseDate ?? new Date()).toISOString(),
    platforms: {
      'windows-x86_64': {
        signature: app.signature ?? '',
        url: app.executableUrl,
      },
    },
  });
});

export default router;
