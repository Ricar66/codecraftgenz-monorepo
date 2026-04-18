// src/services/referral.service.ts
// Programa de indicação: geração de códigos, validação e concessão de pontos.

import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

const REFERRAL_POINTS = 50;
const CODE_LENGTH = 6;

// Caracteres legíveis (sem 0/O/1/I) para evitar confusão.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export const referralService = {
  /**
   * Retorna o código de indicação do usuário, gerando e persistindo se não existir.
   */
  async getOrCreateCode(userId: number): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) {
      throw Object.assign(new Error('Usuário não encontrado'), { code: 'NOT_FOUND' });
    }

    if (user.referralCode) return user.referralCode;

    // Tenta gerar um código único — com ~32^6 combinações, colisão é rara.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { referralCode: code },
        });
        logger.info({ userId, code }, 'Referral code generated');
        return code;
      } catch (err: any) {
        // P2002 = unique violation — tenta outro código
        if (err?.code !== 'P2002') throw err;
      }
    }

    throw new Error('Falha ao gerar código de indicação único');
  },

  /**
   * Estatísticas do programa de indicação para o usuário.
   */
  async getStats(userId: number): Promise<{ totalReferrals: number; pointsEarned: number; code: string | null }> {
    const [user, aggregate] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      }),
      prisma.referral.aggregate({
        where: { referrerId: userId },
        _count: { _all: true },
        _sum: { points: true },
      }),
    ]);

    return {
      totalReferrals: aggregate._count._all,
      pointsEarned: aggregate._sum.points || 0,
      code: user?.referralCode || null,
    };
  },

  /**
   * Processa uma indicação: valida o código, cria o Referral e concede pontos ao referrer.
   * Não lança em caso de código inválido — apenas retorna { ok: false, reason }.
   */
  async useCode(code: string, newUserId: number): Promise<{ ok: boolean; reason?: string }> {
    if (!code || !newUserId) return { ok: false, reason: 'invalid_input' };

    const normalized = code.trim().toUpperCase();
    if (normalized.length !== CODE_LENGTH) {
      return { ok: false, reason: 'invalid_format' };
    }

    const referrer = await prisma.user.findUnique({
      where: { referralCode: normalized },
      select: { id: true },
    });

    if (!referrer) return { ok: false, reason: 'code_not_found' };
    if (referrer.id === newUserId) return { ok: false, reason: 'self_referral' };

    // Verifica se o usuário indicado já foi indicado antes
    const existing = await prisma.referral.findUnique({
      where: { referredId: newUserId },
    });
    if (existing) return { ok: false, reason: 'already_referred' };

    try {
      await prisma.$transaction([
        prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: newUserId,
            points: REFERRAL_POINTS,
          },
        }),
        prisma.user.update({
          where: { id: referrer.id },
          data: { points: { increment: REFERRAL_POINTS } },
        }),
      ]);

      logger.info(
        { referrerId: referrer.id, referredId: newUserId, points: REFERRAL_POINTS },
        'Referral registered'
      );
      return { ok: true };
    } catch (err: any) {
      logger.warn({ err, code: normalized, newUserId }, 'Failed to register referral');
      return { ok: false, reason: 'internal_error' };
    }
  },
};
