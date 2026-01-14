import { prisma } from '../db/prisma.js';
import type { CreateAppInput, UpdateAppInput } from '../schemas/app.schema.js';

export const appRepository = {
  async findAll() {
    return prisma.app.findMany({
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { purchases: true, feedbacks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findPublic() {
    return prisma.app.findMany({
      where: { status: { in: ['published', 'available', 'finalizado', 'ready'] } },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        _count: {
          select: { purchases: true, feedbacks: true },
        },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async findByCreator(creatorId: number) {
    return prisma.app.findMany({
      where: { creatorId },
      include: {
        _count: {
          select: { purchases: true, feedbacks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: number) {
    return prisma.app.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        feedbacks: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { purchases: true, feedbacks: true },
        },
      },
    });
  },

  async findByName(name: string) {
    // MySQL é case-insensitive por padrão com collation utf8mb4_general_ci
    return prisma.app.findFirst({
      where: {
        name: name,
      },
    });
  },

  async create(data: CreateAppInput & { creatorId: number }) {
    return prisma.app.create({
      data: {
        name: data.name,
        description: data.description,
        shortDescription: data.short_description,
        price: data.price ?? 0,
        category: data.category,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        thumbUrl: data.thumb_url,
        screenshots: data.screenshots ? JSON.stringify(data.screenshots) : null,
        executableUrl: data.executable_url,
        version: data.version ?? '1.0.0',
        status: data.status ?? 'draft',
        featured: data.featured ?? false,
        creatorId: data.creatorId,
      },
    });
  },

  async update(id: number, data: UpdateAppInput) {
    return prisma.app.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        shortDescription: data.short_description,
        price: data.price,
        category: data.category,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
        thumbUrl: data.thumb_url,
        screenshots: data.screenshots ? JSON.stringify(data.screenshots) : undefined,
        executableUrl: data.executable_url,
        version: data.version,
        status: data.status,
        featured: data.featured,
      },
    });
  },

  async delete(id: number) {
    return prisma.app.delete({
      where: { id },
    });
  },

  async exists(id: number) {
    const count = await prisma.app.count({ where: { id } });
    return count > 0;
  },

  async incrementDownloads(id: number) {
    return prisma.app.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
      },
    });
  },

  async getAverageRating(id: number) {
    const result = await prisma.feedback.aggregate({
      where: { appId: id },
      _avg: { rating: true },
    });
    return result._avg.rating ?? 0;
  },
};
