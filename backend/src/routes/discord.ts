import { Router } from 'express';
import * as discordOAuth from '../services/discord-oauth.service.js';
import { authenticate } from '../middlewares/auth.js';
import { prisma } from '../db/prisma.js';

const router = Router();

// GET /api/discord/auth/url — gera URL de autorização
router.get('/auth/url', authenticate, async (req: any, res) => {
  try {
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_REDIRECT_URI) {
      return res.status(503).json({ error: 'Discord OAuth não configurado' });
    }
    const url = discordOAuth.generateAuthUrl(req.user.id);
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discord/callback — callback do OAuth
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  const frontendUrl = process.env.FRONTEND_URL ?? 'https://codecraftgenz.com.br';

  if (error) {
    return res.redirect(`${frontendUrl}/perfil?discord=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/perfil?discord=error&reason=missing_params`);
  }

  try {
    await discordOAuth.handleCallback(code, state);
    res.redirect(`${frontendUrl}/perfil?discord=linked`);
  } catch (err: any) {
    res.redirect(`${frontendUrl}/perfil?discord=error&reason=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/discord/status — status do link do usuário autenticado
router.get('/status', authenticate, async (req: any, res) => {
  try {
    const status = await discordOAuth.getStatus(req.user.id);
    res.json({ linked: !!status, ...(status ?? {}) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discord/unlink — desvincular conta
router.delete('/unlink', authenticate, async (req: any, res) => {
  try {
    await discordOAuth.unlink(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discord/bot-status — status do bot (apenas admin)
router.get('/bot-status', authenticate, async (_req, res) => {
  try {
    const botUrl = process.env.INTERNAL_BOT_URL ?? 'http://127.0.0.1:3001';
    const secret = process.env.INTERNAL_WEBHOOK_SECRET;
    if (!secret) return res.json({ online: false, reason: 'not configured' });

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);

    const response = await fetch(`${botUrl}/health`, {
      headers: { 'x-internal-secret': secret },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timeout));

    if (response.ok) {
      const data = await response.json() as Record<string, unknown>;
      res.json({ online: true, ...data });
    } else {
      res.json({ online: false });
    }
  } catch {
    res.json({ online: false });
  }
});

// GET /api/discord/logs — logs do bot (apenas admin)
router.get('/logs', authenticate, async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = 20;
    const [logs, total] = await Promise.all([
      prisma.botLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.botLog.count(),
    ]);
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discord/config — configurações do bot
router.get('/config', authenticate, async (_req, res) => {
  try {
    const configs = await prisma.botConfig.findMany();
    const result: Record<string, string> = {};
    configs.forEach(c => { result[c.key] = c.value; });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discord/config — salvar configurações
router.put('/config', authenticate, async (req, res) => {
  try {
    const configs = req.body as Record<string, string>;
    await Promise.all(
      Object.entries(configs).map(([key, value]) =>
        prisma.botConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discord/trigger/:action — triggers manuais
router.post('/trigger/:action', authenticate, async (req, res) => {
  try {
    const action = req.params['action'] as string;
    const validActions = ['news', 'vagas', 'ranking'];
    if (!validActions.includes(action)) {
      res.status(400).json({ error: 'Ação inválida' });
      return;
    }
    const result = await discordOAuth.notifyBot(`/hook/trigger/${action}`, {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, online: false });
  }
});

export default router;
