import { projectRepository } from '../repositories/project.repository.js';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema.js';

export const projectService = {
  async getAll() {
    const projects = await projectRepository.findAll();
    return projects.map(mapProject);
  },

  async getById(id: number) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw AppError.notFound('Projeto');
    }
    return mapProject(project);
  },

  async getByStatus(status: string) {
    const projects = await projectRepository.findByStatus(status);
    return projects.map(mapProject);
  },

  async create(data: CreateProjectInput) {
    const project = await projectRepository.create(data);
    return mapProject(project);
  },

  async update(id: number, data: UpdateProjectInput, userId?: number) {
    const before = await projectRepository.findById(id);
    if (!before) {
      throw AppError.notFound('Projeto');
    }

    const project = await projectRepository.update(id, data);

    // Regra de negócio: Projeto vira 'finalizado' → cria App em 'revisar' automaticamente.
    // Idempotente: se já existe App com esse projectId, não duplica.
    // Herda nome + descrição + thumb do Projeto. Preço inicia 0; admin completa depois.
    if (data.status === 'finalizado' && before.status !== 'finalizado') {
      await autoCreateAppForProject(project, userId).catch((err) => {
        logger.error({ err, projectId: id }, 'Falha ao auto-criar App ao finalizar Projeto');
        // Não propaga: Projeto permanece finalizado, admin pode finalizar de novo se quiser retentar
      });
    }

    return mapProject(project);
  },

  async delete(id: number) {
    const exists = await projectRepository.exists(id);
    if (!exists) {
      throw AppError.notFound('Projeto');
    }

    await projectRepository.delete(id);
  },
};

/**
 * Cria App em 'revisar' vinculado ao Projeto recém-finalizado.
 * Idempotente por projectId.
 */
async function autoCreateAppForProject(
  project: { id: number; nome: string; descricao: string | null; thumbUrl: string | null },
  userId?: number,
) {
  const existing = await prisma.app.findFirst({ where: { projectId: project.id } });
  if (existing) {
    logger.info({ projectId: project.id, appId: existing.id }, 'App já existe pro Projeto — auto-create ignorado');
    return;
  }

  // Creator: usuário que disparou o request; fallback p/ primeiro admin (compat com chamadas internas)
  let creatorId = userId;
  if (!creatorId) {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ['admin', 'administrator', 'superadmin', 'owner'] } },
      select: { id: true },
    });
    if (!admin) {
      throw new Error('Nenhum admin disponível para ser creator do App auto-criado');
    }
    creatorId = admin.id;
  }

  // Nome do App = nome do Projeto. Se já existir App com mesmo nome (sem projectId, ex: app legado),
  // sufixa com #projectId para evitar conflito do unique de name.
  let appName = project.nome;
  const dupName = await prisma.app.findFirst({ where: { name: appName } });
  if (dupName) {
    appName = `${project.nome} #${project.id}`;
  }

  const app = await prisma.app.create({
    data: {
      name: appName,
      description: project.descricao,
      thumbUrl: project.thumbUrl,
      price: 0,
      status: 'revisar',
      projectId: project.id,
      creatorId,
      version: '1.0.0',
    },
  });

  logger.info(
    { projectId: project.id, appId: app.id, appName },
    'App auto-criado em revisar ao finalizar Projeto',
  );
}

function mapProject(project: {
  id: number;
  nome: string;
  owner: string | null;
  descricao: string | null;
  status: string;
  preco: unknown;
  progresso: number;
  dataInicio: string | null;
  thumbUrl: string | null;
  tagsJson?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  let tecnologias: string[] = [];
  if (project.tagsJson) {
    try {
      tecnologias = JSON.parse(project.tagsJson);
    } catch {
      tecnologias = [];
    }
  }

  return {
    id: project.id,
    nome: project.nome,
    owner: project.owner,
    descricao: project.descricao,
    status: project.status,
    preco: Number(project.preco),
    progresso: project.progresso,
    data_inicio: project.dataInicio,
    thumb_url: project.thumbUrl,
    tecnologias,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}
