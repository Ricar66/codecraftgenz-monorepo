import { z } from 'zod';

export const createTeamSchema = z.object({
  body: z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(128),
    descricao: z.string().max(1000).optional(),
    logo_url: z.string().url().optional(),
    status: z.enum(['ativo', 'inativo']).default('ativo'),
  }),
});

export const updateTeamSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    nome: z.string().min(1).max(128).optional(),
    descricao: z.string().max(1000).optional(),
    logo_url: z.string().url().optional(),
    status: z.enum(['ativo', 'inativo']).optional(),
  }),
});

export const teamIdSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});

export const updateTeamStatusSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    status: z.enum(['ativo', 'inativo']),
  }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>['body'];
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>['body'];
