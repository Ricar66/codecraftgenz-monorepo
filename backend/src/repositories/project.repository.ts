import { prisma } from '../db/prisma.js';
import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema.js';

export const projectRepository = {
  async findAll() {
    return prisma.project.findMany({
      include: {
        mentor: {
          select: { id: true, nome: true, especialidade: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: number) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        mentor: {
          select: { id: true, nome: true, especialidade: true, bio: true },
        },
      },
    });
  },

  async findByStatus(status: string) {
    return prisma.project.findMany({
      where: { status },
      include: {
        mentor: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: CreateProjectInput) {
    return prisma.project.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        status: data.status ?? 'ativo',
        preco: data.preco ?? 0,
        progresso: data.progresso ?? 0,
        thumbUrl: data.thumb_url,
        mentorId: data.mentor_id,
      },
    });
  },

  async update(id: number, data: UpdateProjectInput) {
    return prisma.project.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        status: data.status,
        preco: data.preco,
        progresso: data.progresso,
        thumbUrl: data.thumb_url,
        mentorId: data.mentor_id,
      },
    });
  },

  async delete(id: number) {
    return prisma.project.delete({
      where: { id },
    });
  },

  async assignMentor(projectId: number, mentorId: number) {
    return prisma.project.update({
      where: { id: projectId },
      data: { mentorId },
    });
  },

  async exists(id: number) {
    const count = await prisma.project.count({ where: { id } });
    return count > 0;
  },
};
