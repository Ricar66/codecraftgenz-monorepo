import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(256),
    descricao: z.string().max(4000).optional(),
    status: z.enum(['ativo', 'inativo', 'concluido']).default('ativo'),
    preco: z.number().min(0).default(0),
    progresso: z.number().int().min(0).max(100).default(0),
    thumb_url: z.string().url().optional(),
    mentor_id: z.number().int().positive().optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    nome: z.string().min(1).max(256).optional(),
    descricao: z.string().max(4000).optional(),
    status: z.enum(['ativo', 'inativo', 'concluido']).optional(),
    preco: z.number().min(0).optional(),
    progresso: z.number().int().min(0).max(100).optional(),
    thumb_url: z.string().url().optional(),
    mentor_id: z.number().int().positive().nullable().optional(),
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
