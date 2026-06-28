import { z } from 'zod';

// Aceita URLs normais ou data URIs (base64)
const urlOrDataUri = z.string().refine(
  (val) => {
    if (!val) return true;
    // Aceita data URIs
    if (val.startsWith('data:')) return true;
    // Aceita URLs
    try {
      new URL(val);
      return true;
    } catch {
      // Aceita paths relativos
      return val.startsWith('/') || val.startsWith('./');
    }
  },
  { message: 'URL ou data URI inválido' }
);

// Status de App (definitivo): apenas "revisar" (interno) ou "publicar" (Loja).
// Normaliza valores legados (draft/published/available/ready/finalizado/archived) para
// que dados antigos continuem aceitos enquanto a migration roda.
const appStatus = z.string().transform((val) => {
  const v = String(val).toLowerCase();
  const PUBLICAR = ['publicar', 'published', 'publicado', 'available', 'disponivel', 'disponível', 'ready', 'finalizado'];
  const REVISAR  = ['revisar', 'draft', 'rascunho', 'archived', 'arquivado'];
  if (PUBLICAR.includes(v)) return 'publicar';
  if (REVISAR.includes(v))  return 'revisar';
  return 'revisar'; // fallback seguro: não publica nada sem intenção
});

export const createAppSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(256),
    description: z.string().max(4000).optional().nullable(),
    short_description: z.string().max(512).optional().nullable(),
    price: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().min(0)).default(0),
    original_price: z
      .union([z.number(), z.string().transform(Number), z.null()])
      .pipe(z.number().min(0).nullable())
      .optional()
      .nullable(),
    category: z.string().max(64).optional().nullable(),
    tags: z.union([z.array(z.string()), z.string()]).optional().nullable(),
    thumb_url: urlOrDataUri.optional().nullable(),
    screenshots: z.union([z.array(z.string()), z.string()]).optional().nullable(),
    executable_url: z.string().optional().nullable(),
    platforms: z.union([z.array(z.string()), z.string()]).optional().nullable(),
    version: z.string().max(32).default('1.0.0'),
    status: appStatus.default('revisar'),
    featured: z.union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')]).default(false),
    license_type: z.string().max(32).optional(),
  }),
});

export const updateAppSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    name: z.string().min(1).max(256).optional(),
    description: z.string().max(4000).optional().nullable(),
    short_description: z.string().max(512).optional().nullable(),
    price: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().min(0)).optional(),
    original_price: z
      .union([z.number(), z.string().transform(Number), z.null()])
      .pipe(z.number().min(0).nullable())
      .optional()
      .nullable(),
    category: z.string().max(64).optional().nullable(),
    tags: z.union([z.array(z.string()), z.string()]).optional().nullable(),
    thumb_url: urlOrDataUri.optional().nullable(),
    screenshots: z.union([z.array(z.string()), z.string()]).optional().nullable(),
    executable_url: z.string().optional().nullable(),
    platforms: z.union([z.array(z.string()), z.string()]).optional().nullable(),
    version: z.string().max(32).optional(),
    status: appStatus.optional(),
    featured: z.union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')]).optional(),
    license_type: z.string().max(32).optional(),
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
    status: z.enum(['revisar', 'publicar']).default('revisar'),
  }),
});

export type CreateAppInput = z.infer<typeof createAppSchema>['body'];
export type UpdateAppInput = z.infer<typeof updateAppSchema>['body'];
export type PurchaseAppInput = z.infer<typeof purchaseAppSchema>['body'];
export type FeedbackInput = z.infer<typeof feedbackSchema>['body'];
