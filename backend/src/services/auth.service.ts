import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import { generateToken } from '../middlewares/auth.js';
import { logger } from '../utils/logger.js';
import { userService } from './user.service.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import { leadService } from './lead.service.js';
import { env } from '../config/env.js';
import { emailService } from './email.service.js';

const SALT_ROUNDS = 10;

/**
 * Auth Service
 * Handles authentication business logic
 */
export const authService = {
  /**
   * Login user
   */
  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Mensagem genérica para todos os casos de falha — evita enumeração de contas
    const genericError = AppError.unauthorized('Email ou senha inválidos');

    if (!user) {
      throw genericError;
    }

    if (user.status !== 'ativo') {
      // Não revelar se a conta existe com status inativo — mesma mensagem genérica
      throw genericError;
    }

    // Conta guest não tem senha definida — mesma mensagem para não revelar o tipo
    if (user.isGuest) {
      throw genericError;
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw genericError;
    }

    // Verificar se existem compras de usuarios guest com mesmo email
    // que precisam ser vinculadas a este usuario
    try {
      const guestUsers = await prisma.user.findMany({
        where: {
          email: data.email,
          isGuest: true,
          id: { not: user.id },
        },
      });

      // Se encontrou usuarios guest com mesmo email, faz o merge
      for (const guestUser of guestUsers) {
        await userService.mergeGuestIntoUser(guestUser.id, user.id);
        logger.info({ guestUserId: guestUser.id, userId: user.id }, 'Guest user merged on login');
      }
    } catch (mergeError) {
      // Log erro mas nao falha o login
      logger.warn({ error: mergeError, userId: user.id }, 'Falha ao fazer merge de guest users no login');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    logger.info({ userId: user.id }, 'User logged in');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  },

  /**
   * Register new user
   */
  async register(data: RegisterInput) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    let user;

    if (existingUser) {
      // Se existe e e guest, converte para usuario regular
      if (existingUser.isGuest) {
        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: data.name,
            passwordHash: hashedPassword,
            isGuest: false,
          },
        });
        logger.info({ userId: user.id }, 'Guest user converted to regular on register');
      } else {
        throw AppError.conflict('Email ja cadastrado');
      }
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

      // Create user
      user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          name: data.name,
          role: 'viewer',
          status: 'ativo',
          isGuest: false,
        },
      });

      logger.info({ userId: user.id }, 'User registered');
    }

    // Captura lead de registro
    leadService.captureLead({
      nome: user.name || undefined,
      email: user.email,
      origin: 'registration',
    }).catch((e) => { logger.warn({ error: e }, 'Non-critical async operation failed'); });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  },

  /**
   * Get current user
   */
  async me(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        mfaEnabled: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw AppError.notFound('Usuário');
    }

    return user;
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if email exists
    if (!user) {
      logger.info({ email }, 'Password reset requested for non-existent email');
      return;
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete old tokens
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Create new token (hash the token for storage)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        email: user.email,
        tokenHash,
        expiresAt,
      },
    });

    logger.info({ userId: user.id }, 'Password reset token created');

    // Envia o link de reset por email — token nunca é retornado na API
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    void emailService.sendPasswordReset({
      to: user.email,
      name: user.name || 'Usuário',
      resetLink,
    });

    // Por segurança, não revelamos se o email existe ou não
    // Retornamos sempre a mesma mensagem
  },

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(token: string, newPassword: string) {
    // Hash the token to find it in database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!reset) {
      throw AppError.badRequest('Token inválido ou expirado');
    }

    if (reset.usedAt) {
      throw AppError.badRequest('Token já utilizado');
    }

    if (reset.expiresAt < new Date()) {
      throw AppError.badRequest('Token expirado');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);

    logger.info({ userId: reset.userId }, 'Password reset completed');
  },

  /**
   * Change password (authenticated)
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound('Usuário');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw AppError.badRequest('Senha atual incorreta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    logger.info({ userId }, 'Password changed');
  },

  /**
   * Complete onboarding — marks user as onboarded and upserts Crafter profile
   */
  async completeOnboarding(userId: number, data: { area?: string; skills?: string[]; bio?: string }) {
    // Mark onboarding complete on User
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    // Upsert Crafter profile with area/skills/bio if provided
    if (data.area || (data.skills && data.skills.length > 0) || data.bio) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      const skillsList = [data.area, ...(data.skills || [])].filter(Boolean) as string[];
      await prisma.crafter.upsert({
        where: { userId },
        update: {
          ...(data.bio ? { bio: data.bio } : {}),
          ...(skillsList.length > 0 ? { skillsJson: JSON.stringify(skillsList) } : {}),
        },
        create: {
          nome: user?.name || '',
          email: user?.email,
          bio: data.bio,
          skillsJson: skillsList.length > 0 ? JSON.stringify(skillsList) : undefined,
          userId,
        },
      });
    }
  },

  /**
   * Google OAuth - login or register with Google ID token
   */
  async googleAuth(credential: string) {
    // Verify the Google ID token
    const payload = await verifyGoogleToken(credential);

    if (!payload || !payload.email) {
      throw AppError.unauthorized('Token do Google inválido');
    }

    const { email, name } = payload;

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // User exists
      if (user.status !== 'ativo') {
        throw AppError.forbidden('Conta desativada ou suspensa');
      }

      // If guest user, convert to regular
      if (user.isGuest) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: name || user.name,
            isGuest: false,
            // Set a random password hash since they use Google
            passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS),
          },
        });
        logger.info({ userId: user.id }, 'Guest user converted via Google OAuth');
      }

      // Merge any guest users with same email
      try {
        const guestUsers = await prisma.user.findMany({
          where: { email, isGuest: true, id: { not: user.id } },
        });
        for (const guestUser of guestUsers) {
          await userService.mergeGuestIntoUser(guestUser.id, user.id);
        }
      } catch (mergeError) {
        logger.warn({ error: mergeError, userId: user.id }, 'Falha ao merge guests no Google login');
      }

      logger.info({ userId: user.id }, 'User logged in via Google');
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: name || 'Usuário Google',
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS),
          role: 'viewer',
          status: 'ativo',
          isGuest: false,
        },
      });

      logger.info({ userId: user.id }, 'User registered via Google');

      // Capture lead
      leadService.captureLead({
        nome: user.name || undefined,
        email: user.email,
        origin: 'registration' as const,
      }).catch((e) => { logger.warn({ error: e }, 'Non-critical async operation failed'); });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  },
};

/**
 * Verify Google ID token using Google's tokeninfo endpoint
 */
async function verifyGoogleToken(credential: string): Promise<{ email: string; name: string; sub: string } | null> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!response.ok) {
      logger.warn('Google token verification failed');
      return null;
    }

    const payload = await response.json() as Record<string, string>;

    // Audience check é obrigatório — falha fechado se GOOGLE_CLIENT_ID não estiver configurado
    if (!env.GOOGLE_CLIENT_ID) {
      logger.error('GOOGLE_CLIENT_ID não configurado — login Google desabilitado');
      return null;
    }

    if (payload.aud !== env.GOOGLE_CLIENT_ID) {
      logger.warn({ aud: payload.aud }, 'Google token audience mismatch');
      return null;
    }

    return {
      email: payload.email,
      name: payload.name || '',
      sub: payload.sub,
    };
  } catch (error) {
    logger.error({ error }, 'Error verifying Google token');
    return null;
  }
}
