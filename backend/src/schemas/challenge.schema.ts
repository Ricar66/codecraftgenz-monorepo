import { z } from 'zod';

export const createChallengeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(256),
    objective: z.string().max(1000).optional(),
    description: z.string().max(4000).optional(),
    difficulty: z.enum(['facil', 'medio', 'dificil']).default('medio'),
    deadline: z.string().datetime().optional(),
    reward: z.number().min(0).optional(),
    base_points: z.number().int().min(0).default(100),
    tags: z.array(z.string()).optional(),
    delivery_type: z.enum(['link', 'file', 'text']).default('link'),
    thumb_url: z.string().url().optional(),
    visible: z.boolean().default(true),
  }),
});

export const updateChallengeSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    name: z.string().min(1).max(256).optional(),
    objective: z.string().max(1000).optional(),
    description: z.string().max(4000).optional(),
    difficulty: z.enum(['facil', 'medio', 'dificil']).optional(),
    deadline: z.string().datetime().optional(),
    reward: z.number().min(0).optional(),
    base_points: z.number().int().min(0).optional(),
    tags: z.array(z.string()).optional(),
    delivery_type: z.enum(['link', 'file', 'text']).optional(),
    thumb_url: z.string().url().optional(),
    status: z.enum(['draft', 'active', 'closed']).optional(),
    visible: z.boolean().optional(),
  }),
});

export const challengeIdSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});

export const submitChallengeSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    delivery_url: z.string().url().optional(),
    delivery_text: z.string().max(4000).optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const reviewSubmissionSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']).optional(),
    score: z.number().int().min(0).max(100).optional(),
    feedback: z.string().max(2000).optional(),
  }),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>['body'];
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>['body'];
export type SubmitChallengeInput = z.infer<typeof submitChallengeSchema>['body'];
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>['body'];
