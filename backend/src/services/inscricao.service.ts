import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import type { CreateInscricaoInput, UpdateInscricaoStatusInput } from '../schemas/inscricao.schema.js';
import { leadService } from './lead.service.js';
import { logger } from '../utils/logger.js';

export const inscricaoService = {
  async getAll() {
    const inscricoes = await prisma.inscricao.findMany({
      include: {
        projeto: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return inscricoes.map(mapInscricao);
  },

  async getById(id: number) {
    const inscricao = await prisma.inscricao.findUnique({
      where: { id },
      include: {
        projeto: {
          select: { id: true, nome: true },
        },
      },
    });
    if (!inscricao) {
      throw AppError.notFound('Inscrição');
    }
    return mapInscricao(inscricao);
  },

  async create(data: CreateInscricaoInput) {
    // Verificar se já existe inscrição com mesmo email para mesmo projeto
    if (data.projeto_id) {
      const existing = await prisma.inscricao.findFirst({
        where: {
          email: data.email,
          projetoId: data.projeto_id,
          status: { notIn: ['rejeitada', 'concluida'] },
        },
      });
      if (existing) {
        throw AppError.conflict('Você já tem uma inscrição ativa para este projeto');
      }
    }

    const inscricao = await prisma.inscricao.create({
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        redeSocial: data.rede_social,
        cep: data.cep,
        cidade: data.cidade,
        estado: data.estado,
        areaInteresse: data.area_interesse,
        mensagem: data.mensagem,
        projetoId: data.projeto_id,
        tipo: data.tipo ?? 'geral',
        status: 'pendente',
      },
    });

    // Captura lead
    leadService.captureLead({
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      origin: 'crafter_signup',
      originId: inscricao.id,
    }).catch((e) => { logger.warn({ error: e }, 'Non-critical async operation failed'); });

    return mapInscricao(inscricao);
  },

  async updateStatus(id: number, data: UpdateInscricaoStatusInput) {
    const exists = await prisma.inscricao.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Inscrição');
    }

    const inscricao = await prisma.inscricao.update({
      where: { id },
      data: {
        status: data.status,
        notas: data.notas,
      },
    });
    return mapInscricao(inscricao);
  },

  async delete(id: number) {
    const exists = await prisma.inscricao.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Inscrição');
    }
    await prisma.inscricao.delete({ where: { id } });
  },
};

function mapInscricao(inscricao: {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  redeSocial?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  areaInteresse?: string | null;
  mensagem: string | null;
  projetoId: number | null;
  tipo: string;
  status: string;
  notas: string | null;
  createdAt: Date;
  updatedAt: Date;
  projeto?: { id: number; nome: string } | null;
}) {
  return {
    id: inscricao.id,
    nome: inscricao.nome,
    email: inscricao.email,
    telefone: inscricao.telefone,
    rede_social: inscricao.redeSocial || null,
    cep: inscricao.cep || null,
    cidade: inscricao.cidade || null,
    estado: inscricao.estado || null,
    area_interesse: inscricao.areaInteresse || null,
    mensagem: inscricao.mensagem,
    projeto_id: inscricao.projetoId,
    tipo: inscricao.tipo,
    status: inscricao.status,
    notas: inscricao.notas,
    projeto: inscricao.projeto
      ? { id: inscricao.projeto.id, nome: inscricao.projeto.nome }
      : null,
    created_at: inscricao.createdAt,
    updated_at: inscricao.updatedAt,
  };
}
