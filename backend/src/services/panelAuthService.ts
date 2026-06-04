import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { env, isProd } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const PANEL_JWT_AUDIENCE = 'codecraft-panel';
export const PANEL_JWT_ISSUER = 'codecraft-api';
export const PANEL_COOKIE_NAME = 'panel_session';
export const PANEL_CSRF_COOKIE_NAME = 'panel_csrf';
export const PANEL_CSRF_HEADER_NAME = 'x-panel-csrf';

export interface PanelJwtPayload {
  uid: number;
  email: string;
  sid: string; // session id (cuid) — vinculado à tabela panel_sessions
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}

function getPanelSecret(): string {
  if (!env.PANEL_JWT_SECRET) {
    throw AppError.internal('PANEL_JWT_SECRET não configurado');
  }
  return env.PANEL_JWT_SECRET;
}

function getAllowedEmails(): Set<string> {
  const raw = env.PANEL_ALLOWED_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isEmailAllowed(email: string): boolean {
  const allow = getAllowedEmails();
  if (allow.size === 0) return false; // segurança: lista vazia = ninguém
  return allow.has(email.trim().toLowerCase());
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.PANEL_BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface CreateSessionInput {
  userId: number;
  ip?: string | null;
  userAgent?: string | null;
}

export async function createSession({ userId, ip, userAgent }: CreateSessionInput) {
  const sessionToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = sha256Hex(sessionToken);
  const expiresAt = new Date(Date.now() + env.PANEL_SESSION_HOURS * 60 * 60 * 1000);

  const session = await prisma.panelSession.create({
    data: {
      userId,
      tokenHash,
      ip: ip?.slice(0, 45) ?? null,
      userAgent: userAgent?.slice(0, 255) ?? null,
      expiresAt,
    },
  });

  return { session, sessionToken, expiresAt };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.panelSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

export async function findActiveSession(sessionId: string, sessionToken: string) {
  const tokenHash = sha256Hex(sessionToken);
  const session = await prisma.panelSession.findFirst({
    where: {
      id: sessionId,
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
  return session;
}

export function signPanelJwt(payload: { uid: number; email: string; sid: string; sessionToken: string }): string {
  return jwt.sign(
    {
      uid: payload.uid,
      email: payload.email,
      sid: payload.sid,
      stk: payload.sessionToken, // session token vai dentro do JWT (cookie httpOnly)
    },
    getPanelSecret(),
    {
      algorithm: 'HS256',
      audience: PANEL_JWT_AUDIENCE,
      issuer: PANEL_JWT_ISSUER,
      expiresIn: `${env.PANEL_SESSION_HOURS}h`,
    }
  );
}

export function verifyPanelJwt(token: string): PanelJwtPayload & { stk: string } {
  return jwt.verify(token, getPanelSecret(), {
    algorithms: ['HS256'],
    audience: PANEL_JWT_AUDIENCE,
    issuer: PANEL_JWT_ISSUER,
  }) as PanelJwtPayload & { stk: string };
}

function cookieDomain(): string | undefined {
  // Em produção, compartilha cookie entre api.* e painel.* (mesmo eTLD+1).
  if (!isProd) return undefined;
  return env.COOKIE_DOMAIN || undefined;
}

export function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: isProd,
    // 'lax' em produção: necessário para o cookie ser enviado em navegação
    // top-level cross-subdomain (painel.* iniciando request pra api.*).
    // 'strict' em dev pra continuar pegando bugs cedo.
    sameSite: isProd ? ('lax' as const) : ('strict' as const),
    path: '/',
    maxAge: maxAgeMs,
    ...(cookieDomain() ? { domain: cookieDomain() } : {}),
  };
}

export function csrfCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: false, // o frontend precisa ler para enviar no header
    secure: isProd,
    sameSite: isProd ? ('lax' as const) : ('strict' as const),
    path: '/',
    maxAge: maxAgeMs,
    ...(cookieDomain() ? { domain: cookieDomain() } : {}),
  };
}
