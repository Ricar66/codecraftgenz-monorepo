import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import { generateToken } from '../middlewares/auth.js';
import { logger } from '../utils/logger.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';

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

    if (!user) {
      throw AppError.unauthorized('Email ou senha inválidos');
    }

    if (user.status !== 'ativo') {
      throw AppError.forbidden('Conta desativada ou suspensa');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw AppError.unauthorized('Email ou senha inválidos');
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

    if (existingUser) {
      throw AppError.conflict('Email já cadastrado');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        name: data.name,
        role: 'viewer',
        status: 'ativo',
      },
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    logger.info({ userId: user.id }, 'User registered');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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

    // TODO: Send email with reset link
    // await emailService.sendPasswordReset(user.email, token);

    return { token }; // In production, don't return token - send via email
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
};
