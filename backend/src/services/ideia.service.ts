// src/services/ideia.service.ts
// Ideas / Voting system - CRUD + votos + comentarios

import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

interface CreateIdeiaInput {
  titulo: string;
  descricao: string;
}

interface AddCommentInput {
  texto: string;
}

interface UserContext {
  id: number;
  name: string;
}

export const ideiaService = {
  /**
   * Lista todas as ideias com comentarios, ordenadas por votos desc
   */
  async getAll() {
    const ideias = await prisma.ideia.findMany({
      orderBy: { votos: 'desc' },
      include: {
        comentarios: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return ideias.map((i) => ({
      id: i.id,
      titulo: i.titulo,
      descricao: i.descricao,
      autor: i.autorNome || 'Anonimo',
      autorId: i.autorId,
      votos: i.votos,
      status: i.status,
      data_criacao: i.createdAt,
      comentarios: i.comentarios.map((c) => ({
        id: c.id,
        autor: c.autorNome || 'Anonimo',
        autorId: c.autorId,
        texto: c.texto,
        data_criacao: c.createdAt,
      })),
    }));
  },

  /**
   * Cria uma nova ideia
   */
  async create(data: CreateIdeiaInput, user: UserContext) {
    const ideia = await prisma.ideia.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao,
        autorId: user.id,
        autorNome: user.name,
      },
      include: {
        comentarios: true,
      },
    });

    logger.info({ ideiaId: ideia.id, autorId: user.id }, 'Ideia criada');

    return {
      id: ideia.id,
      titulo: ideia.titulo,
      descricao: ideia.descricao,
      autor: ideia.autorNome || 'Anonimo',
      autorId: ideia.autorId,
      votos: ideia.votos,
      status: ideia.status,
      data_criacao: ideia.createdAt,
      comentarios: [],
    };
  },

  /**
   * Incrementa voto de uma ideia
   */
  async vote(ideiaId: number) {
    const ideia = await prisma.ideia.update({
      where: { id: ideiaId },
      data: { votos: { increment: 1 } },
    });

    logger.info({ ideiaId }, 'Voto registrado na ideia');

    return { id: ideia.id, votos: ideia.votos };
  },

  /**
   * Adiciona comentario a uma ideia
   */
  async addComment(ideiaId: number, data: AddCommentInput, user: UserContext) {
    // Verifica se a ideia existe
    const ideia = await prisma.ideia.findUnique({ where: { id: ideiaId } });
    if (!ideia) {
      return null;
    }

    const comentario = await prisma.ideiaComentario.create({
      data: {
        ideiaId,
        autorId: user.id,
        autorNome: user.name,
        texto: data.texto,
      },
    });

    logger.info({ ideiaId, comentarioId: comentario.id, autorId: user.id }, 'Comentario adicionado na ideia');

    return {
      id: comentario.id,
      autor: comentario.autorNome || 'Anonimo',
      autorId: comentario.autorId,
      texto: comentario.texto,
      data_criacao: comentario.createdAt,
    };
  },
};
