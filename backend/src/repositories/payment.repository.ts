import { prisma } from '../db/prisma.js';
import type { SearchPaymentsQuery } from '../schemas/payment.schema.js';

export const paymentRepository = {
  async findAll(query: SearchPaymentsQuery) {
    const { app_id, status, email, from_date, to_date, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (app_id) where.appId = app_id;
    if (status) where.status = status;
    // MySQL: case-insensitive by default (depends on collation), remove 'mode' for compatibility
    if (email) where.payerEmail = { contains: email };

    if (from_date || to_date) {
      where.createdAt = {};
      if (from_date) (where.createdAt as Record<string, Date>).gte = new Date(from_date);
      if (to_date) (where.createdAt as Record<string, Date>).lte = new Date(to_date);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          app: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total, page, limit };
  },

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        app: {
          select: { id: true, name: true, price: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async findByPreferenceId(preferenceId: string) {
    return prisma.payment.findFirst({
      where: { preferenceId },
    });
  },

  async findByAppAndEmail(appId: number, email: string) {
    return prisma.payment.findMany({
      where: { appId, payerEmail: email },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findLastByApp(appId: number) {
    return prisma.payment.findFirst({
      where: { appId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: {
    id: string;
    appId: number;
    userId?: number;
    preferenceId?: string;
    status: string;
    amount: number;
    unitPrice?: number;
    quantity?: number;
    installments?: number;
    currency?: string;
    payerEmail?: string;
    payerName?: string;
    mpResponseJson?: string;
  }) {
    return prisma.payment.create({
      data: {
        id: data.id,
        appId: data.appId,
        userId: data.userId,
        preferenceId: data.preferenceId,
        status: data.status,
        amount: data.amount,
        unitPrice: data.unitPrice,
        quantity: data.quantity ?? 1,
        installments: data.installments ?? 1,
        currency: data.currency ?? 'BRL',
        payerEmail: data.payerEmail,
        payerName: data.payerName,
        mpResponseJson: data.mpResponseJson,
      },
    });
  },

  async updateStatus(id: string, status: string, mpResponseJson?: string) {
    return prisma.payment.update({
      where: { id },
      data: {
        status,
        mpResponseJson,
        updatedAt: new Date(),
      },
    });
  },

  async countApprovedByEmailAndApp(email: string, appId: number) {
    return prisma.payment.count({
      where: {
        payerEmail: email,
        appId,
        status: 'approved',
      },
    });
  },

  async getAppPaymentsAdmin(appId?: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = appId ? { appId } : {};

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          app: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total, page, limit };
  },
};
