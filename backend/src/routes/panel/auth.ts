import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/response.js';
import { validate } from '../../middlewares/validate.js';
import { rateLimiter } from '../../middlewares/rateLimiter.js';
import { authenticatePanel, panelCsrfGuard } from '../../middlewares/authPanel.js';
import { panelLoginSchema } from '../../schemas/panel.schema.js';
import { env } from '../../config/env.js';
import {
  PANEL_COOKIE_NAME,
  PANEL_CSRF_COOKIE_NAME,
  cookieOptions,
  createSession,
  csrfCookieOptions,
  generateCsrfToken,
  isEmailAllowed,
  revokeSession,
  signPanelJwt,
  verifyPassword,
} from '../../services/panelAuthService.js';

const router = Router();

const sessionMs = () => env.PANEL_SESSION_HOURS * 60 * 60 * 1000;

/**
 * GET /api/panel/auth/csrf
 * Emite (ou rotaciona) o cookie de CSRF e devolve o token em JSON.
 * Frontend chama antes de qualquer POST/PATCH/DELETE.
 */
router.get('/csrf', (_req: Request, res: Response) => {
  const csrf = generateCsrfToken();
  res.cookie(PANEL_CSRF_COOKIE_NAME, csrf, csrfCookieOptions(sessionMs()));
  return sendSuccess(res, { csrf });
});

/**
 * POST /api/panel/auth/login
 * Login com email + senha.
 * - Rate limit estrito (5/15min por IP+email — herda authLimiter)
 * - Verifica allowlist por email ANTES de validar senha
 * - bcrypt timing-safe
 * - Erros genéricos (não revela se email existe)
 */
router.post(
  '/login',
  rateLimiter.auth,
  validate(panelLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.validated!.body as { email: string; password: string };

      const genericFail = () => {
        // Mensagem genérica + delay aleatório para mitigar enumeração e timing
        const jitter = Math.floor(Math.random() * 120) + 80;
        return new Promise<void>((resolve) => setTimeout(resolve, jitter)).then(() => {
          throw AppError.unauthorized('Credenciais inválidas');
        });
      };

      if (!isEmailAllowed(email)) {
        await genericFail();
        return;
      }

      const user = await prisma.panelUser.findUnique({ where: { email } });
      if (!user || user.status !== 'ativo') {
        await genericFail();
        return;
      }

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        await genericFail();
        return;
      }

      const { session, sessionToken, expiresAt } = await createSession({
        userId: user.id,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent']?.toString() ?? null,
      });

      const token = signPanelJwt({
        uid: user.id,
        email: user.email,
        sid: session.id,
        sessionToken,
      });

      const csrf = generateCsrfToken();

      res
        .cookie(PANEL_COOKIE_NAME, token, cookieOptions(sessionMs()))
        .cookie(PANEL_CSRF_COOKIE_NAME, csrf, csrfCookieOptions(sessionMs()));

      await prisma.panelUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return sendSuccess(res, {
        user: { id: user.id, email: user.email, name: user.name },
        csrf,
        expiresAt,
      });
    } catch (e) {
      return next(e);
    }
  }
);

/**
 * POST /api/panel/auth/logout
 * Revoga a sessão atual e limpa cookies.
 */
router.post('/logout', authenticatePanel, panelCsrfGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.panelUser) {
      await revokeSession(req.panelUser.sessionId);
    }
    res.clearCookie(PANEL_COOKIE_NAME, { path: '/' });
    res.clearCookie(PANEL_CSRF_COOKIE_NAME, { path: '/' });
    return sendSuccess(res, { ok: true });
  } catch (e) {
    return next(e);
  }
});

/**
 * GET /api/panel/auth/me
 * Retorna dados do usuário logado.
 */
router.get('/me', authenticatePanel, (req: Request, res: Response) => {
  const u = req.panelUser!;
  return sendSuccess(res, { id: u.id, email: u.email, name: u.name });
});

/**
 * GET /api/panel/auth/users
 * Lista todos os usuários ativos do painel — usado para popular o select
 * "Responsável" ao criar/editar tarefa.
 */
router.get('/users', authenticatePanel, async (_req, res, next) => {
  try {
    const users = await prisma.panelUser.findMany({
      where: { status: 'ativo' },
      select: { id: true, email: true, name: true },
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, users);
  } catch (e) {
    return next(e);
  }
});

export default router;
