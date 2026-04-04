import { Router, Request, Response } from 'express';
import { newsService } from '../services/news.service.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';

const router = Router();

// Público — lista notícias para o frontend
router.get('/', async (req: Request, res: Response) => {
  const { category, limit, page } = req.query;
  const result = await newsService.list({
    category: category as string,
    limit: Number(limit) || 12,
    page: Number(page) || 1,
  });
  res.json(result);
});

// Admin — forçar atualização manual
router.post('/refresh', authenticate, authorizeAdmin, async (_req: Request, res: Response) => {
  const count = await newsService.fetchAndSave();
  res.json({ success: true, count });
});

export default router;
