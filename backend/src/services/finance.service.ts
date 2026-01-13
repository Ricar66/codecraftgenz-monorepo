import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import type { Decimal } from '@prisma/client/runtime/library';

export interface CreateFinanceInput {
  item: string;
  valor: number;
  status?: string;
  type?: string;
  project_id?: number | null;
  progress?: number;
}

export interface UpdateFinanceInput {
  item?: string;
  valor?: number;
  status?: string;
  type?: string;
  project_id?: number | null;
  progress?: number;
}

export const financeService = {
  async getAll() {
    const finances = await prisma.finance.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: { id: true, nome: true },
        },
      },
    });
    return finances.map(mapFinance);
  },

  async getById(id: number) {
    const finance = await prisma.finance.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, nome: true },
        },
      },
    });
    if (!finance) {
      throw AppError.notFound('Finance record');
    }
    return mapFinance(finance);
  },

  async create(data: CreateFinanceInput) {
    const finance = await prisma.finance.create({
      data: {
        item: data.item,
        valor: data.valor,
        status: data.status || 'pending',
        type: data.type || 'other',
        projectId: data.project_id,
        progress: data.progress || 0,
      },
    });
    return mapFinance(finance);
  },

  async update(id: number, data: UpdateFinanceInput) {
    const exists = await prisma.finance.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Finance record');
    }

    const finance = await prisma.finance.update({
      where: { id },
      data: {
        item: data.item,
        valor: data.valor,
        status: data.status,
        type: data.type,
        projectId: data.project_id,
        progress: data.progress,
      },
    });
    return mapFinance(finance);
  },

  async delete(id: number) {
    const exists = await prisma.finance.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Finance record');
    }
    await prisma.finance.delete({ where: { id } });
  },
};

function mapFinance(finance: {
  id: number;
  item: string;
  valor: Decimal;
  status: string | null;
  type: string | null;
  projectId: number | null;
  progress: number | null;
  createdAt: Date;
  updatedAt: Date;
  project?: { id: number; nome: string } | null;
}) {
  return {
    id: finance.id,
    item: finance.item,
    valor: Number(finance.valor),
    status: finance.status || 'pending',
    type: finance.type || 'other',
    project_id: finance.projectId,
    progress: finance.progress || 0,
    project: finance.project
      ? { id: finance.project.id, nome: finance.project.nome }
      : null,
    created_at: finance.createdAt,
    updated_at: finance.updatedAt,
  };
}
