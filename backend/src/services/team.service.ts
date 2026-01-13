import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import type { CreateTeamInput, UpdateTeamInput } from '../schemas/team.schema.js';

export const teamService = {
  async getAll() {
    const teams = await prisma.equipe.findMany({
      include: {
        _count: {
          select: { membros: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return teams.map(mapTeam);
  },

  async getById(id: number) {
    const team = await prisma.equipe.findUnique({
      where: { id },
      include: {
        membros: {
          select: {
            id: true,
            nome: true,
            avatarUrl: true,
            pontos: true,
          },
        },
        _count: {
          select: { membros: true },
        },
      },
    });
    if (!team) {
      throw AppError.notFound('Equipe');
    }
    return mapTeamDetailed(team);
  },

  async create(data: CreateTeamInput) {
    const team = await prisma.equipe.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        logoUrl: data.logo_url,
        status: data.status ?? 'ativo',
      },
    });
    return mapTeam(team);
  },

  async update(id: number, data: UpdateTeamInput) {
    const exists = await prisma.equipe.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Equipe');
    }

    const team = await prisma.equipe.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        logoUrl: data.logo_url,
        status: data.status,
      },
    });
    return mapTeam(team);
  },

  async delete(id: number) {
    const exists = await prisma.equipe.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Equipe');
    }
    await prisma.equipe.delete({ where: { id } });
  },

  async updateStatus(id: number, status: string) {
    const exists = await prisma.equipe.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Equipe');
    }

    const team = await prisma.equipe.update({
      where: { id },
      data: { status },
    });
    return mapTeam(team);
  },
};

function mapTeam(team: {
  id: number;
  nome: string;
  descricao: string | null;
  logoUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { membros: number };
}) {
  return {
    id: team.id,
    nome: team.nome,
    descricao: team.descricao,
    logo_url: team.logoUrl,
    status: team.status,
    membros_count: team._count?.membros ?? 0,
    created_at: team.createdAt,
    updated_at: team.updatedAt,
  };
}

function mapTeamDetailed(team: {
  id: number;
  nome: string;
  descricao: string | null;
  logoUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  membros?: Array<{
    id: number;
    nome: string;
    avatarUrl: string | null;
    pontos: number;
  }>;
  _count?: { membros: number };
}) {
  const base = mapTeam(team);
  return {
    ...base,
    membros: team.membros?.map((m) => ({
      id: m.id,
      nome: m.nome,
      avatar_url: m.avatarUrl,
      pontos: m.pontos,
    })) ?? [],
  };
}
