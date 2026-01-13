import { z } from 'zod';

export const createAppSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(256),
    description: z.string().max(4000).optional(),
    short_description: z.string().max(512).optional(),
    price: z.number().min(0).default(0),
    category: z.string().max(64).optional(),
    tags: z.array(z.string()).optional(),
    thumb_url: z.string().url().optional(),
    screenshots: z.array(z.string().url()).optional(),
    executable_url: z.string().optional(),
    version: z.string().max(32).default('1.0.0'),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    featured: z.boolean().default(false),
  }),
});

export const updateAppSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    name: z.string().min(1).max(256).optional(),
    description: z.string().max(4000).optional(),
    short_description: z.string().max(512).optional(),
    price: z.number().min(0).optional(),
    category: z.string().max(64).optional(),
    tags: z.array(z.string()).optional(),
    thumb_url: z.string().url().optional(),
    screenshots: z.array(z.string().url()).optional(),
    executable_url: z.string().optional(),
    version: z.string().max(32).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    featured: z.boolean().optional(),
  }),
});

export const appIdSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});

export const purchaseAppSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    email: z.string().email('Email inválido'),
    name: z.string().min(1).optional(),
  }),
});

export const downloadByEmailSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    email: z.string().email('Email inválido'),
  }),
});

export const feedbackSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
  }),
});

export const createFromProjectSchema = z.object({
  params: z.object({
    projectId: z.string().transform(Number),
  }),
  body: z.object({
    price: z.number().min(0).optional(),
    status: z.enum(['draft', 'published']).default('draft'),
  }),
});

export type CreateAppInput = z.infer<typeof createAppSchema>['body'];
export type UpdateAppInput = z.infer<typeof updateAppSchema>['body'];
export type PurchaseAppInput = z.infer<typeof purchaseAppSchema>['body'];
export type FeedbackInput = z.infer<typeof feedbackSchema>['body'];
