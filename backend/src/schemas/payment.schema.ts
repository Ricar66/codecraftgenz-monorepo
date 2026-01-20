import { z } from 'zod';

// Schema para compra padrão (preferência MP / Wallet)
// Email é opcional pois no Wallet o usuário loga diretamente no Mercado Pago
export const purchaseSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    email: z.string().email('Email inválido').optional(),
    name: z.string().min(1).optional(),
    paymentMethod: z.string().optional(), // pix, credit_card, etc
    quantity: z.number().int().min(1).max(10).optional().default(1), // Quantidade de licenças (1-10)
  }).optional().default({}),
});

// Schema para pagamento direto (cartão, PIX, boleto)
export const directPaymentSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    // Dados do pagamento
    token: z.string().optional(), // Token do cartão (MP.js)
    payment_method_id: z.string(), // master, visa, pix, ticket, etc
    installments: z.number().int().min(1).max(4).optional().default(1), // Parcelas (1-4)
    quantity: z.number().int().min(1).max(10).optional().default(1), // Quantidade de licenças (1-10)
    description: z.string().optional(),
    binary_mode: z.boolean().optional(),
    capture: z.boolean().optional(),
    external_reference: z.string().optional(),
    issuer_id: z.string().or(z.number()).optional(),

    // Dados do pagador
    payer: z.object({
      email: z.string().email(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      identification: z.object({
        type: z.enum(['CPF', 'CNPJ']).optional(),
        number: z.string().optional(),
      }).optional(),
    }),

    // Informações adicionais
    additional_info: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type DirectPaymentInput = z.infer<typeof directPaymentSchema>['body'];

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
