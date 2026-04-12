import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const DISCORD_API = 'https://discord.com/api/v10';
const SCOPES = 'identify email guilds.join';

function encryptToken(token: string): string {
  const key = env.DISCORD_TOKEN_ENCRYPT_KEY;
  if (!key) return token;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
  return iv.toString('hex') + ':' + cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
}

function decryptToken(encrypted: string): string {
  const key = env.DISCORD_TOKEN_ENCRYPT_KEY;
  if (!key) return encrypted;
  const [ivHex, data] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

export function generateAuthUrl(userId: number): string {
  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID ?? '',
    redirect_uri: env.DISCORD_REDIRECT_URI ?? '',
    response_type: 'code',
    scope: SCOPES,
    state,
  });
  return `${DISCORD_API}/oauth2/authorize?${params}`;
}

export async function handleCallback(code: string, state: string) {
  // Decodifica state
  let userId: number;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    userId = decoded.userId;
    // Valida que o state não tem mais de 10 minutos
    if (Date.now() - decoded.ts > 10 * 60 * 1000) throw new Error('State expirado');
  } catch {
    throw new Error('State inválido');
  }

  // Trocar code por token
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID ?? '',
      client_secret: env.DISCORD_CLIENT_SECRET ?? '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI ?? '',
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Falha ao trocar code: ${err}`);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  // Buscar dados do usuário Discord
  const meRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!meRes.ok) throw new Error('Falha ao buscar perfil Discord');

  const discordUser = await meRes.json() as {
    id: string;
    username: string;
    avatar: string | null;
  };

  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Salvar no banco
  await prisma.discordLink.upsert({
    where: { userId },
    update: {
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordAvatar: discordUser.avatar,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt,
      updatedAt: new Date(),
    },
    create: {
      userId,
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordAvatar: discordUser.avatar,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt,
    },
  });

  // Verificar se usuário é Crafter e notificar o bot
  const crafter = await prisma.crafter.findFirst({ where: { userId } });
  if (crafter) {
    await notifyBot('/hook/crafter-role', { discordId: discordUser.id }).catch(e =>
      logger.warn({ err: (e as Error).message }, 'Falha ao notificar bot para cargo Crafter')
    );
  }

  return { discordUsername: discordUser.username, discordId: discordUser.id };
}

export async function getStatus(userId: number) {
  const link = await prisma.discordLink.findUnique({
    where: { userId },
    select: { discordUsername: true, discordAvatar: true, discordId: true, crafterRoleAssigned: true, linkedAt: true },
  });
  return link;
}

export async function unlink(userId: number) {
  await prisma.discordLink.deleteMany({ where: { userId } });
}

export async function notifyBot(path: string, payload: Record<string, unknown>) {
  const botUrl = env.INTERNAL_BOT_URL ?? 'http://127.0.0.1:3001';
  const secret = env.INTERNAL_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('INTERNAL_WEBHOOK_SECRET não configurado — pulando notificação ao bot');
    return;
  }
  const res = await fetch(`${botUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Bot retornou ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function triggerCrafterRole(userId: number) {
  const link = await prisma.discordLink.findUnique({ where: { userId } });
  if (!link || link.crafterRoleAssigned) return;
  await notifyBot('/hook/crafter-role', { discordId: link.discordId });
}
