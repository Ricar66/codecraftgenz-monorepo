import { z } from 'zod';

export const purchaseSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    email: z.string().email('Email inválido'),
    name: z.string().min(1).optional(),
  }),
});

export const paymentIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const updatePaymentSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'refunded', 'cancelled']),
    notes: z.string().max(1000).optional(),
  }),
});

export const searchPaymentsSchema = z.object({
  query: z.object({
    app_id: z.string().transform(Number).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'refunded', 'cancelled']).optional(),
    email: z.string().email().optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
  }),
});

export const webhookSchema = z.object({
  body: z.object({
    action: z.string().optional(),
    type: z.string().optional(),
    data: z.object({
      id: z.string().or(z.number()).optional(),
    }).optional(),
  }),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>['body'];
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>['body'];
export type SearchPaymentsQuery = z.infer<typeof searchPaymentsSchema>['query'];
