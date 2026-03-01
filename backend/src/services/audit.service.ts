// src/services/audit.service.ts
// Sistema de auditoria global - fire-and-forget

import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

function methodToAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST': return 'CREATE';
    case 'PUT': case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return method.toUpperCase();
  }
}

const ENTITY_MAP: Record<string, string> = {
  apps: 'App', projetos: 'Project', desafios: 'Challenge',
  auth: 'Auth', users: 'User', feedbacks: 'Feedback',
  proposals: 'Proposal', uploads: 'Upload', payments: 'Payment',
  licenses: 'License', inscricoes: 'Inscricao', crafters: 'Crafter',
  equipes: 'Equipe', mentores: 'Mentor', ranking: 'Ranking',
  financas: 'Finance', config: 'Config', nfse: 'NFSe',
  leads: 'Lead', dashboard: 'Dashboard', downloads: 'Download',
  hub: 'Hub',
};

function extractEntity(path: string): string {
  const match = path.match(/^\/api\/([^/?]+)/);
  if (!match) return 'unknown';
  return ENTITY_MAP[match[1]] || match[1];
}

function extractEntityId(path: string): string | null {
  const match = path.match(/^\/api\/[^/]+\/(\d+)/);
  return match ? match[1] : null;
}

const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'password_hash', 'token',
  'secret', 'creditCard', 'cvv', 'accessToken', 'refreshToken',
]);

function sanitizeBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const sanitized = { ...(body as Record<string, unknown>) };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.has(key)) sanitized[key] = '[REDACTED]';
  }
  try {
    const str = JSON.stringify(sanitized);
    return str.length > 4000 ? str.substring(0, 4000) : str;
  } catch {
    return null;
  }
}

interface AuditData {
  userId?: number;
  userName?: string;
  method: string;
  path: string;
  statusCode: number;
  body?: unknown;
  oldData?: unknown;
  ip?: string;
  userAgent?: string;
  duration?: number;
}

export function logAudit(data: AuditData): void {
  prisma.auditLog.create({
    data: {
      userId: data.userId ?? null,
      userName: data.userName ?? null,
      action: methodToAction(data.method),
      entity: extractEntity(data.path),
      entityId: extractEntityId(data.path),
      endpoint: data.path.substring(0, 512),
      method: data.method.toUpperCase(),
      statusCode: data.statusCode,
      oldData: data.oldData ? sanitizeBody(data.oldData) : null,
      newData: sanitizeBody(data.body),
      ip: data.ip ?? null,
      userAgent: data.userAgent?.substring(0, 512) ?? null,
      duration: data.duration ?? null,
    },
  }).catch((err) => {
    logger.warn({ error: (err as Error).message }, 'Falha ao gravar audit log');
  });
}
