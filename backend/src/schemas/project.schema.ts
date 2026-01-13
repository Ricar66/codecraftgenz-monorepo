import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    // Aceita 'nome' ou 'titulo' do frontend
    nome: z.string().min(1, 'Nome é obrigatório').max(256).optional(),
    titulo: z.string().min(1, 'Título é obrigatório').max(256).optional(),
    owner: z.string().max(256).optional(),
    descricao: z.string().max(4000).optional(),
    data_inicio: z.string().optional(),
    // Status: aceita formatos do frontend e backend
    status: z.enum(['ativo', 'inativo', 'concluido', 'rascunho', 'ongoing', 'finalizado', 'draft']).default('ativo'),
    preco: z.union([z.number(), z.string().transform(Number)]).default(0),
    progresso: z.union([z.number(), z.string().transform(Number)]).default(0),
    thumb_url: z.string().optional().nullable(),
    mentor_id: z.number().int().positive().optional().nullable(),
    tecnologias: z.array(z.string()).optional(),
  }).refine(data => data.nome || data.titulo, {
    message: 'Nome ou título é obrigatório',
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    nome: z.string().min(1).max(256).optional(),
    titulo: z.string().min(1).max(256).optional(),
    owner: z.string().max(256).optional(),
    descricao: z.string().max(4000).optional(),
    data_inicio: z.string().optional(),
    status: z.enum(['ativo', 'inativo', 'concluido', 'rascunho', 'ongoing', 'finalizado', 'draft']).optional(),
    preco: z.union([z.number(), z.string().transform(Number)]).optional(),
    progresso: z.union([z.number(), z.string().transform(Number)]).optional(),
    thumb_url: z.string().optional().nullable(),
    mentor_id: z.number().int().positive().nullable().optional(),
    tecnologias: z.array(z.string()).optional(),
  }),
});

export const projectIdSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});

export const assignMentorSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    mentor_id: z.number().int().positive(),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>['body'];
