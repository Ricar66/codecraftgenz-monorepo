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
  // Senhas
  'password', 'passwordHash', 'password_hash', 'senha', 'newPassword',
  'currentPassword', 'new_password', 'old_password', 'confirm_password',
  'confirmPassword',
  // Tokens e segredos
  'token', 'accessToken', 'refreshToken', 'secret', 'admin_token',
  'adminToken', 'x-admin-token', 'apiKey', 'api_key',
  // Dados de cartão (PCI)
  'creditCard', 'credit_card', 'cvv', 'cvc', 'cardNumber', 'card_number',
  'cardToken', 'card_token',
  // Documentos e dados pessoais sensíveis
  'cpf', 'cnpj', 'number', // payer.identification.number (CPF no MP)
  // Chaves privadas
  'privateKey', 'private_key',
]);

/**
 * Sanitiza recursivamente um objeto, redactando chaves sensíveis em qualquer nível.
 */
function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[MAX_DEPTH]';
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) || SENSITIVE_KEYS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeValue(val, depth + 1);
    }
  }
  return sanitized;
}

function sanitizeBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  try {
    const sanitized = sanitizeValue(body);
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
