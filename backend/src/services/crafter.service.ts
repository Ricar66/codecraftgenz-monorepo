import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import type { CreateCrafterInput, UpdateCrafterInput } from '../schemas/crafter.schema.js';

export const crafterService = {
  async getAll() {
    const crafters = await prisma.crafter.findMany({
      include: {
        equipe: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { pontos: 'desc' },
    });
    return crafters.map(mapCrafter);
  },

  async getById(id: number) {
    const crafter = await prisma.crafter.findUnique({
      where: { id },
      include: {
        equipe: {
          select: { id: true, nome: true },
        },
      },
    });
    if (!crafter) {
      throw AppError.notFound('Crafter');
    }
    return mapCrafter(crafter);
  },

  async create(data: CreateCrafterInput) {
    const crafter = await prisma.crafter.create({
      data: {
        nome: data.nome,
        email: data.email,
        bio: data.bio,
        avatarUrl: data.avatar_url,
        githubUrl: data.github_url,
        linkedinUrl: data.linkedin_url,
        skillsJson: data.skills ? JSON.stringify(data.skills) : null,
        equipeId: data.equipe_id,
        userId: data.user_id,
        pontos: 0,
      },
    });
    return mapCrafter(crafter);
  },

  async update(id: number, data: UpdateCrafterInput) {
    const exists = await prisma.crafter.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Crafter');
    }

    const crafter = await prisma.crafter.update({
      where: { id },
      data: {
        nome: data.nome,
        email: data.email,
        bio: data.bio,
        avatarUrl: data.avatar_url,
        githubUrl: data.github_url,
        linkedinUrl: data.linkedin_url,
        skillsJson: data.skills ? JSON.stringify(data.skills) : undefined,
        equipeId: data.equipe_id,
        pontos: data.pontos,
      },
    });
    return mapCrafter(crafter);
  },

  async delete(id: number) {
    const exists = await prisma.crafter.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Crafter');
    }
    await prisma.crafter.delete({ where: { id } });
  },

  async updatePoints(crafterId: number, pontos: number) {
    const crafter = await prisma.crafter.findUnique({ where: { id: crafterId } });
    if (!crafter) {
      throw AppError.notFound('Crafter');
    }

    const updated = await prisma.crafter.update({
      where: { id: crafterId },
      data: { pontos },
    });
    return mapCrafter(updated);
  },

  async getRanking(limit = 10) {
    const crafters = await prisma.crafter.findMany({
      orderBy: { pontos: 'desc' },
      take: limit,
      include: {
        equipe: {
          select: { id: true, nome: true },
        },
      },
    });
    return crafters.map((c, index) => ({
      position: index + 1,
      ...mapCrafter(c),
    }));
  },

  async updateTop3(top3: Array<{ crafter_id: number; position: number }>) {
    // Atualiza tabela de top3 do ranking
    await prisma.rankingTop3.deleteMany({});

    for (const item of top3) {
      await prisma.rankingTop3.create({
        data: {
          crafterId: item.crafter_id,
          position: item.position,
        },
      });
    }

    return { updated: true };
  },
};

function mapCrafter(crafter: {
  id: number;
  nome: string;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  skillsJson: string | null;
  pontos: number;
  equipeId: number | null;
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
  equipe?: { id: number; nome: string } | null;
}) {
  let skills: string[] = [];
  if (crafter.skillsJson) {
    try {
      skills = JSON.parse(crafter.skillsJson);
    } catch {
      skills = [];
    }
  }

  return {
    id: crafter.id,
    nome: crafter.nome,
    email: crafter.email,
    bio: crafter.bio,
    avatar_url: crafter.avatarUrl,
    github_url: crafter.githubUrl,
    linkedin_url: crafter.linkedinUrl,
    skills,
    pontos: crafter.pontos,
    equipe_id: crafter.equipeId,
    user_id: crafter.userId,
    equipe: crafter.equipe
      ? { id: crafter.equipe.id, nome: crafter.equipe.nome }
      : null,
    created_at: crafter.createdAt,
    updated_at: crafter.updatedAt,
  };
}
