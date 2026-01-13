import { z } from 'zod';

export const createInscricaoSchema = z.object({
  body: z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(128),
    email: z.string().email('Email inválido'),
    telefone: z.string().max(20).optional(),
    mensagem: z.string().max(2000).optional(),
    projeto_id: z.number().int().positive().optional(),
    tipo: z.enum(['curso', 'projeto', 'mentoria', 'geral']).default('geral'),
  }),
});

export const updateInscricaoStatusSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    status: z.enum(['pendente', 'aprovada', 'rejeitada', 'em_andamento', 'concluida']),
    notas: z.string().max(1000).optional(),
  }),
});

export const inscricaoIdSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});

export type CreateInscricaoInput = z.infer<typeof createInscricaoSchema>['body'];
export type UpdateInscricaoStatusInput = z.infer<typeof updateInscricaoStatusSchema>['body'];
