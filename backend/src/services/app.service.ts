import { appRepository } from '../repositories/app.repository.js';
import { AppError } from '../utils/AppError.js';
import type { CreateAppInput, UpdateAppInput, FeedbackInput } from '../schemas/app.schema.js';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

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
        price: options.price ?? (Number(project.preco) || 0),
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
      where: { status: { in: ['published', 'available', 'finalizado', 'ready'] } },
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

  async uploadExecutable(appId: number, file: { originalname: string; buffer: Buffer; size: number }) {
    const app = await appRepository.findById(appId);
    if (!app) {
      throw AppError.notFound('App');
    }

    // Sanitiza o nome original do arquivo (remove caracteres perigosos)
    const originalName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_') // substitui caracteres especiais por _
      .replace(/__+/g, '_'); // remove underscores duplicados

    // Diretório de downloads (usa disco persistente do Render: /var/downloads)
    const downloadsDir = env.DOWNLOADS_DIR || path.join(process.cwd(), 'public', 'downloads');
    await fs.mkdir(downloadsDir, { recursive: true });

    const filePath = path.join(downloadsDir, originalName);
    await fs.writeFile(filePath, file.buffer);

    // URL relativa para download
    const executableUrl = `/downloads/${originalName}`;

    // Atualizar app com URL do executável
    await prisma.app.update({
      where: { id: appId },
      data: { executableUrl },
    });

    logger.info({ appId, file: originalName, size: file.size, path: filePath }, 'Executável salvo no disco');

    return {
      file_name: originalName,
      file_size: file.size,
      executable_url: executableUrl,
    };
  },

  async devInsert(data: Record<string, unknown>, creatorId: number) {
    // Inserção rápida para desenvolvimento
    const app = await prisma.app.create({
      data: {
        name: String(data.name || 'App Dev'),
        description: data.description ? String(data.description) : null,
        shortDescription: data.shortDescription ? String(data.shortDescription) : null,
        price: Number(data.price || 0),
        category: data.category ? String(data.category) : null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        thumbUrl: data.thumbUrl ? String(data.thumbUrl) : null,
        screenshots: data.screenshots ? JSON.stringify(data.screenshots) : null,
        executableUrl: data.executableUrl ? String(data.executableUrl) : null,
        version: String(data.version || '1.0.0'),
        status: String(data.status || 'draft'),
        featured: Boolean(data.featured),
        creatorId,
      },
    });

    logger.info({ appId: app.id, name: app.name }, 'App inserido via dev endpoint');

    return mapApp(app);
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
