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

// Legacy: entrega por crafter_id no body (mantido para compatibilidade)
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

// Review legacy (score 0-100)
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

// =============================================================
// Novo fluxo de submissão (GitHub/GitLab repo)
// =============================================================

// Regex simples para validar URLs de github.com ou gitlab.com (com ou sem www)
const REPO_URL_REGEX = /^https?:\/\/(www\.)?(github|gitlab)\.com\/[\w.-]+\/[\w.-]+(\/?|\.git)?$/i;

export const submitRepoSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    repoUrl: z
      .string()
      .url('URL inválida')
      .regex(REPO_URL_REGEX, 'URL deve ser do GitHub ou GitLab'),
    description: z.string().max(4000).optional(),
  }),
});

export const listSubmissionsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
  }),
});

export const reviewRepoSubmissionSchema = z.object({
  params: z.object({
    submissionId: z.string().transform(Number),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    feedback: z.string().max(2000).optional(),
    points: z.number().int().min(0).max(100000).optional(),
  }),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>['body'];
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>['body'];
export type SubmitChallengeInput = z.infer<typeof submitChallengeSchema>['body'];
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>['body'];
export type SubmitRepoInput = z.infer<typeof submitRepoSchema>['body'];
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>['query'];
export type ReviewRepoSubmissionInput = z.infer<typeof reviewRepoSubmissionSchema>['body'];
