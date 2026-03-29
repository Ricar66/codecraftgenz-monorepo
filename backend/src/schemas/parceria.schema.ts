import { z } from 'zod';

export const createParceriaSchema = z.object({
  body: z.object({
    nomeContato: z.string().min(1, 'Nome é obrigatório').max(256),
    email: z.string().email('Email inválido'),
    telefone: z.string().max(20).optional(),
    empresa: z.string().min(1, 'Empresa é obrigatória').max(256),
    cargo: z.string().max(128).optional(),
    site: z.string().max(500).optional(),
    tipoParceria: z.enum([
      'tecnologia', 'investimento', 'patrocinio',
      'squads', 'mentoria_corporativa', 'estagio', 'outro',
    ]).default('tecnologia'),
    mensagem: z.string().min(1, 'Mensagem é obrigatória').max(2000),
  }),
});

export const updateParceriaStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['novo', 'em_analise', 'reuniao_agendada', 'fechado', 'recusado']),
    notas: z.string().max(1000).optional(),
  }),
});

export const parceriaIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export type CreateParceriaInput = z.infer<typeof createParceriaSchema>['body'];
export type UpdateParceriaStatusInput = z.infer<typeof updateParceriaStatusSchema>['body'];
