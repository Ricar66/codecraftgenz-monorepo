import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import type { CreateMentorInput, UpdateMentorInput } from '../schemas/mentor.schema.js';

export const mentorService = {
  async getAll() {
    const mentors = await prisma.mentor.findMany({
      orderBy: { nome: 'asc' },
    });
    return mentors.map(mapMentor);
  },

  async getById(id: number) {
    const mentor = await prisma.mentor.findUnique({
      where: { id },
      include: {
        projetos: {
          select: { id: true, nome: true, status: true },
        },
      },
    });
    if (!mentor) {
      throw AppError.notFound('Mentor');
    }
    return mapMentorDetailed(mentor);
  },

  async create(data: CreateMentorInput) {
    const mentor = await prisma.mentor.create({
      data: {
        nome: data.nome,
        email: data.email,
        bio: data.bio,
        especialidade: data.especialidade,
        avatarUrl: data.avatar_url,
        linkedinUrl: data.linkedin_url,
        githubUrl: data.github_url,
        disponivel: data.disponivel ?? true,
      },
    });
    return mapMentor(mentor);
  },

  async update(id: number, data: UpdateMentorInput) {
    const exists = await prisma.mentor.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Mentor');
    }

    const mentor = await prisma.mentor.update({
      where: { id },
      data: {
        nome: data.nome,
        email: data.email,
        bio: data.bio,
        especialidade: data.especialidade,
        avatarUrl: data.avatar_url,
        linkedinUrl: data.linkedin_url,
        githubUrl: data.github_url,
        disponivel: data.disponivel,
      },
    });
    return mapMentor(mentor);
  },

  async delete(id: number) {
    const exists = await prisma.mentor.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Mentor');
    }
    await prisma.mentor.delete({ where: { id } });
  },
};

function mapMentor(mentor: {
  id: number;
  nome: string;
  email: string | null;
  bio: string | null;
  especialidade: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  disponivel: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: mentor.id,
    nome: mentor.nome,
    email: mentor.email,
    bio: mentor.bio,
    especialidade: mentor.especialidade,
    avatar_url: mentor.avatarUrl,
    linkedin_url: mentor.linkedinUrl,
    github_url: mentor.githubUrl,
    disponivel: mentor.disponivel,
    created_at: mentor.createdAt,
    updated_at: mentor.updatedAt,
  };
}

function mapMentorDetailed(mentor: {
  id: number;
  nome: string;
  email: string | null;
  bio: string | null;
  especialidade: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  disponivel: boolean;
  createdAt: Date;
  updatedAt: Date;
  projetos?: Array<{ id: number; nome: string; status: string }>;
}) {
  const base = mapMentor(mentor);
  return {
    ...base,
    projetos: mentor.projetos?.map((p) => ({
      id: p.id,
      nome: p.nome,
      status: p.status,
    })) ?? [],
  };
}
