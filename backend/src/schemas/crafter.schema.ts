import { z } from 'zod';

export const createCrafterSchema = z.object({
  body: z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(128),
    email: z.string().email().optional(),
    bio: z.string().max(1000).optional(),
    avatar_url: z.string().url().optional(),
    github_url: z.string().url().optional(),
    linkedin_url: z.string().url().optional(),
    skills: z.array(z.string()).optional(),
    equipe_id: z.number().int().positive().optional(),
    user_id: z.number().int().positive().optional(),
  }),
});

export const updateCrafterSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    nome: z.string().min(1).max(128).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(1000).optional(),
    avatar_url: z.string().url().optional(),
    github_url: z.string().url().optional(),
    linkedin_url: z.string().url().optional(),
    skills: z.array(z.string()).optional(),
    equipe_id: z.number().int().positive().nullable().optional(),
    pontos: z.number().int().min(0).optional(),
  }),
});

export const crafterIdSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});

export const updatePointsSchema = z.object({
  params: z.object({
    crafterId: z.string().transform(Number),
  }),
  body: z.object({
    pontos: z.number().int().min(0),
  }),
});

export const updateTop3Schema = z.object({
  body: z.object({
    top3: z.array(z.object({
      crafter_id: z.number().int().positive(),
      position: z.number().int().min(1).max(3),
    })).length(3),
  }),
});

export type CreateCrafterInput = z.infer<typeof createCrafterSchema>['body'];
export type UpdateCrafterInput = z.infer<typeof updateCrafterSchema>['body'];
