import { z } from 'zod';

// Custom validation for URLs that also accepts data: URIs (Base64 images)
const urlOrDataUri = z.string().refine(
  (val) => {
    if (!val) return true; // empty is ok since optional
    // Accept http/https URLs
    if (/^https?:\/\/.+/.test(val)) return true;
    // Accept data: URIs (Base64 images)
    if (/^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/.test(val)) return true;
    return false;
  },
  { message: 'Deve ser uma URL válida (http/https) ou imagem Base64' }
).optional();

export const createMentorSchema = z.object({
  body: z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(128),
    email: z.string().email().optional(),
    bio: z.string().max(2000).optional(),
    especialidade: z.string().max(256).optional(),
    avatar_url: urlOrDataUri,
    linkedin_url: z.string().url().optional(),
    github_url: z.string().url().optional(),
    disponivel: z.boolean().default(true),
  }),
});

export const updateMentorSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    nome: z.string().min(1).max(128).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(2000).optional(),
    especialidade: z.string().max(256).optional(),
    avatar_url: urlOrDataUri,
    linkedin_url: z.string().url().optional(),
    github_url: z.string().url().optional(),
    disponivel: z.boolean().optional(),
  }),
});

export const mentorIdSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});

export type CreateMentorInput = z.infer<typeof createMentorSchema>['body'];
export type UpdateMentorInput = z.infer<typeof updateMentorSchema>['body'];
