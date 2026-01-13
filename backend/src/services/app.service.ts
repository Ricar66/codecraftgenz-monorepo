import { appRepository } from '../repositories/app.repository.js';
import { AppError } from '../utils/AppError.js';
import type { CreateAppInput, UpdateAppInput, FeedbackInput } from '../schemas/app.schema.js';
import { prisma } from '../db/prisma.js';

export const appService = {
  async getAll() {
    const apps = await appRepository.findAll();
    return apps.map(mapApp);
  },

  async getPublic() {
    const apps = await appRepository.findPublic();
    return apps.map(mapApp);
  },

  async getByCreator(creatorId: number) {
    const apps = await appRepository.findByCreator(creatorId);
    return apps.map(mapApp);
  },

  async getById(id: number) {
    const app = await appRepository.findById(id);
    if (!app) {
      throw AppError.notFound('App');
    }
    return mapAppDetailed(app);
  },

  async create(data: CreateAppInput, creatorId: number) {
    const existing = await appRepository.findByName(data.name);
    if (existing) {
      throw AppError.conflict('Já existe um app com este nome');
    }

    const app = await appRepository.create({ ...data, creatorId });
    return mapApp(app);
  },

  async createFromProject(projectId: number, creatorId: number, options: { price?: number; status?: string }) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw AppError.notFound('Projeto');
    }

    const existing = await appRepository.findByName(project.nome);
    if (existing) {
      throw AppError.conflict('Já existe um app com o nome deste projeto');
    }

    const app = await prisma.app.create({
      data: {
        name: project.nome,
        description: project.descricao,
        thumbUrl: project.thumbUrl,
        price: options.price ?? Number(project.preco) || 0,
        status: options.status ?? 'draft',
        creatorId,
        version: '1.0.0',
      },
    });

    return mapApp(app);
  },

  async update(id: number, data: UpdateAppInput) {
    const exists = await appRepository.exists(id);
    if (!exists) {
      throw AppError.notFound('App');
    }

    if (data.name) {
      const existing = await appRepository.findByName(data.name);
      if (existing && existing.id !== id) {
        throw AppError.conflict('Já existe um app com este nome');
      }
    }

    const app = await appRepository.update(id, data);
    return mapApp(app);
  },

  async delete(id: number) {
    const exists = await appRepository.exists(id);
    if (!exists) {
      throw AppError.notFound('App');
    }

    await appRepository.delete(id);
  },

  async addFeedback(appId: number, userId: number, data: FeedbackInput) {
    const app = await appRepository.exists(appId);
    if (!app) {
      throw AppError.notFound('App');
    }

    const existingFeedback = await prisma.feedback.findFirst({
      where: { appId, userId },
    });

    if (existingFeedback) {
      const updated = await prisma.feedback.update({
        where: { id: existingFeedback.id },
        data: {
          rating: data.rating,
          comment: data.comment,
        },
      });
      return updated;
    }

    const feedback = await prisma.feedback.create({
      data: {
        appId,
        userId,
        rating: data.rating,
        comment: data.comment,
      },
    });

    return feedback;
  },

  async getHistory() {
    const apps = await prisma.app.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        name: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return apps;
  },
};

function mapApp(app: {
  id: number;
  name: string;
  description: string | null;
  shortDescription: string | null;
  price: unknown;
  category: string | null;
  tags: string | null;
  thumbUrl: string | null;
  screenshots: string | null;
  executableUrl: string | null;
  version: string;
  status: string;
  featured: boolean;
  downloadCount: number;
  creatorId: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: { id: number; name: string; email?: string } | null;
  _count?: { purchases: number; feedbacks: number };
}) {
  return {
    id: app.id,
    name: app.name,
    description: app.description,
    short_description: app.shortDescription,
    price: Number(app.price),
    category: app.category,
    tags: parseJson(app.tags, []),
    thumb_url: app.thumbUrl,
    screenshots: parseJson(app.screenshots, []),
    executable_url: app.executableUrl,
    version: app.version,
    status: app.status,
    featured: app.featured,
    download_count: app.downloadCount,
    creator_id: app.creatorId,
    creator: app.creator
      ? { id: app.creator.id, name: app.creator.name }
      : null,
    purchases_count: app._count?.purchases ?? 0,
    feedbacks_count: app._count?.feedbacks ?? 0,
    created_at: app.createdAt,
    updated_at: app.updatedAt,
  };
}

function mapAppDetailed(app: {
  id: number;
  name: string;
  description: string | null;
  shortDescription: string | null;
  price: unknown;
  category: string | null;
  tags: string | null;
  thumbUrl: string | null;
  screenshots: string | null;
  executableUrl: string | null;
  version: string;
  status: string;
  featured: boolean;
  downloadCount: number;
  creatorId: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: { id: number; name: string; email?: string } | null;
  feedbacks?: Array<{
    id: number;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: { id: number; name: string } | null;
  }>;
  _count?: { purchases: number; feedbacks: number };
}) {
  const base = mapApp(app);
  return {
    ...base,
    feedbacks: app.feedbacks?.map((f) => ({
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      created_at: f.createdAt,
      user: f.user ? { id: f.user.id, name: f.user.name } : null,
    })) ?? [],
  };
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
