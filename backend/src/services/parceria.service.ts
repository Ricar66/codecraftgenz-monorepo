import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import type { CreateParceriaInput, UpdateParceriaStatusInput } from '../schemas/parceria.schema.js';
import { logger } from '../utils/logger.js';

export const parceriaService = {
  async getAll(filters?: { status?: string; search?: string; page?: number; limit?: number }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { nomeContato: { contains: filters.search } },
        { email: { contains: filters.search } },
        { empresa: { contains: filters.search } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 25;

    const [data, total] = await Promise.all([
      prisma.partnership.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.partnership.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id: string) {
    const parceria = await prisma.partnership.findUnique({ where: { id } });
    if (!parceria) throw AppError.notFound('Parceria não encontrada');
    return parceria;
  },

  async create(data: CreateParceriaInput) {
    const parceria = await prisma.partnership.create({ data: { ...data, status: 'novo' } });
    logger.info({ id: parceria.id, empresa: data.empresa }, 'Partnership created');
    return parceria;
  },

  async updateStatus(id: string, data: UpdateParceriaStatusInput) {
    const existing = await prisma.partnership.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Parceria não encontrada');

    const updated = await prisma.partnership.update({
      where: { id },
      data: { status: data.status, notas: data.notas ?? existing.notas },
    });
    logger.info({ id, status: data.status }, 'Partnership status updated');
    return updated;
  },

  async delete(id: string) {
    const existing = await prisma.partnership.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Parceria não encontrada');
    await prisma.partnership.delete({ where: { id } });
    logger.info({ id }, 'Partnership deleted');
  },

  async getStats() {
    const [total, byStatus] = await Promise.all([
      prisma.partnership.count(),
      prisma.partnership.groupBy({ by: ['status'], _count: true }),
    ]);
    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
    };
  },
};
