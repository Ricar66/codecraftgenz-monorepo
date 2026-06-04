import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import {
  PANEL_COOKIE_NAME,
  PANEL_CSRF_COOKIE_NAME,
  PANEL_CSRF_HEADER_NAME,
  findActiveSession,
  isEmailAllowed,
  timingSafeEqual,
  verifyPanelJwt,
} from '../services/panelAuthService.js';

export interface PanelAuthedUser {
  id: number;
  email: string;
  name: string;
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      panelUser?: PanelAuthedUser;
    }
  }
}

/**
 * Middleware de autenticação do painel.
 * Verifica:
 *  1) JWT no cookie httpOnly `panel_session` (com aud=codecraft-panel, iss=codecraft-api)
 *  2) Sessão correspondente ativa no banco (não revogada, não expirada, token hash bate)
 *  3) Email ainda está na allowlist (se removerem o email do .env, sessão é invalidada)
 */
export async function authenticatePanel(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[PANEL_COOKIE_NAME];
    if (!token || typeof token !== 'string') {
      throw AppError.unauthorized('Sessão não encontrada');
    }

    let decoded: ReturnType<typeof verifyPanelJwt>;
    try {
      decoded = verifyPanelJwt(token);
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Sessão expirada');
      }
      throw AppError.unauthorized('Sessão inválida');
    }

    const session = await findActiveSession(decoded.sid, decoded.stk);
    if (!session) {
      throw AppError.unauthorized('Sessão revogada ou expirada');
    }

    // Re-verifica allowlist em cada request (defesa em profundidade contra
    // remoção de email da lista sem invalidar a sessão manualmente).
    if (!isEmailAllowed(session.user.email)) {
      throw AppError.forbidden('Email não autorizado para acessar o painel');
    }

    if (session.user.status !== 'ativo') {
      throw AppError.forbidden('Conta desativada');
    }

    req.panelUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      sessionId: session.id,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware CSRF double-submit token.
 * Em qualquer método modificador (POST/PUT/PATCH/DELETE), exige que:
 *   - cookie `panel_csrf` exista
 *   - header `x-panel-csrf` exista
 *   - ambos sejam idênticos (comparação timing-safe)
 *
 * Como `panel_csrf` é SameSite=Strict + Secure, um site malicioso não consegue
 * lê-lo nem enviá-lo no header — então mesmo que XSRF aconteça via tag/redirect,
 * o header nunca vai bater.
 */
export function panelCsrfGuard(req: Request, _res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const cookieToken = req.cookies?.[PANEL_CSRF_COOKIE_NAME];
  const headerValue = req.headers[PANEL_CSRF_HEADER_NAME];
  const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!cookieToken || !headerToken || typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    return next(AppError.forbidden('CSRF token ausente'));
  }

  if (!timingSafeEqual(cookieToken, headerToken)) {
    return next(AppError.forbidden('CSRF token inválido'));
  }

  next();
}
