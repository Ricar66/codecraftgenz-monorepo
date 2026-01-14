import { Router } from 'express';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { success } from '../utils/response.js';

const router = Router();

/**
 * GET /api/config/mp-public-key
 * Get Mercado Pago public key for frontend
 */
router.get('/mp-public-key', (_req: Request, res: Response) => {
  const publicKey = env.MERCADO_PAGO_PUBLIC_KEY || env.MP_PUBLIC_KEY || '';
  res.json(success({ publicKey }));
});

export default router;
