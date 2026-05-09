// src/utils/crypto.ts
// Helper genérico de criptografia em repouso (PII).
// Usa AES-256-GCM com IV aleatório e auth-tag para detectar adulteração.
// Formato do ciphertext serializado: v1:<iv-hex>:<tag-hex>:<ciphertext-hex>
// Backward compat: valores que NÃO comecem com "v1:" são considerados legacy plaintext
// e retornados como estão pelo decryptField, garantindo migração transparente.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const KEY_SALT = 'codecraft-pii-salt-v1';

function getKey(secret: string): Buffer {
  // scrypt para derivar 32 bytes determinísticos do segredo
  return scryptSync(secret, KEY_SALT, 32);
}

export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const secret = env.PII_ENCRYPT_KEY;
  if (!secret) {
    if (env.NODE_ENV === 'production') {
      throw new Error('PII_ENCRYPT_KEY required in production');
    }
    return plaintext; // dev fallback (apenas para desenvolvimento local)
  }
  const key = getKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  if (!ciphertext.startsWith('v1:')) return ciphertext; // legacy plaintext (backward compat)
  const secret = env.PII_ENCRYPT_KEY;
  if (!secret) {
    if (env.NODE_ENV === 'production') {
      throw new Error('PII_ENCRYPT_KEY required in production');
    }
    return ciphertext;
  }
  try {
    const [, ivHex, tagHex, dataHex] = ciphertext.split(':');
    const key = getKey(secret);
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Mascara um email para uso em logs (PII sanitization).
 * Ex.: "ricardo.moretti@example.com" -> "ri***@example.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}
