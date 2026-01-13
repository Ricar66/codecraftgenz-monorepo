import bcrypt from 'bcrypt';
import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = 10;

/**
 * User Service
 * Handles user management business logic (admin)
 */
export const userService = {
  /**
   * Get all users (admin only)
   */
  async getAll() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  },

  /**
   * Get user by ID
   */
  async getById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw AppError.notFound('Usuário');
    }

    return user;
  },

  /**
   * Create new user (admin only)
   */
  async create(data: { email: string; name: string; password: string; role?: string }) {
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
        role: data.role || 'viewer',
        status: 'ativo',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    logger.info({ userId: user.id }, 'User created by admin');

    return user;
  },

  /**
   * Update user (admin only)
   */
  async update(id: number, data: { name?: string; email?: string; role?: string; status?: string; password?: string }) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw AppError.notFound('Usuário');
    }

    // Check if email is being changed and if it's already taken
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) {
        throw AppError.conflict('Email já cadastrado');
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.status) updateData.status = data.status;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    logger.info({ userId: id }, 'User updated by admin');

    return updatedUser;
  },

  /**
   * Toggle user status (ativo/inativo)
   */
  async toggleStatus(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw AppError.notFound('Usuário');
    }

    const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    logger.info({ userId: id, newStatus }, 'User status toggled');

    return updatedUser;
  },

  /**
   * Delete user
   */
  async delete(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw AppError.notFound('Usuário');
    }

    await prisma.user.delete({
      where: { id },
    });

    logger.info({ userId: id }, 'User deleted');

    return { id };
  },

  /**
   * Admin reset password (with admin token)
   */
  async adminResetPassword(email: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw AppError.notFound('Usuário');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    logger.info({ userId: user.id }, 'Password reset by admin');

    return { message: 'Senha redefinida com sucesso' };
  },
};
