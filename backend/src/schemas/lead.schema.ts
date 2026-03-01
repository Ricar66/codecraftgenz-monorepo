// src/schemas/lead.schema.ts
import { z } from 'zod';

export const leadDashboardSchema = z.object({
  query: z.object({
    periodo: z.string().default('30d'),
  }),
});

export const leadListSchema = z.object({
  query: z.object({
    origin: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

export const updateLeadStatusSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    status: z.enum(['new', 'contacted', 'converted', 'lost']),
  }),
});
