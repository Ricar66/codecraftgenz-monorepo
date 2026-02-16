import { z } from 'zod';

// Schema baseado no JSON que o sistema de vendas envia
const enderecoSchema = z.object({
  logradouro: z.string().min(1),
  numero: z.string().min(1),
  bairro: z.string().min(1),
  codigo_municipio: z.string().min(1),
  uf: z.string().length(2),
  cep: z.string().min(8).max(9),
  complemento: z.string().optional(),
});

const prestadorSchema = z.object({
  cnpj: z.string().min(14).max(14),
  inscricao_municipal: z.string().min(1),
});

const tomadorSchema = z.object({
  tipo: z.enum(['PF', 'PJ']),
  documento: z.string().min(11).max(14),
  razao_social: z.string().optional(),
  email: z.string().email().optional(),
  endereco: enderecoSchema.optional(),
});

const servicoSchema = z.object({
  descricao: z.string().min(1).max(2000),
  item_lista_servico: z.string().min(1),
  codigo_tributacao_municipio: z.string().optional(),
  valor_servicos: z.number().positive(),
  aliquota_iss: z.number().min(0).max(100).optional(),
  iss_retido: z.boolean().default(false),
});

const tributacaoSchema = z.object({
  optante_simples_nacional: z.boolean().default(true),
  incentivo_fiscal: z.boolean().default(false),
  natureza_operacao: z.number().int().min(1).max(6).default(1),
});

// POST /api/nfse/gerar
export const createNfseSchema = {
  body: z.object({
    venda_id: z.string().min(1),
    data_venda: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    competencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    prestador: prestadorSchema,
    tomador: tomadorSchema,
    servico: servicoSchema,
    tributacao: tributacaoSchema.optional().default({
      optante_simples_nacional: true,
      incentivo_fiscal: false,
      natureza_operacao: 1,
    }),
  }),
};

export type CreateNfseInput = z.infer<typeof createNfseSchema.body>;

// POST /api/nfse/:id/cancelar
export const cancelarNfseSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    motivo: z.string().min(1).max(500).optional(),
  }).optional().default({}),
};

// GET /api/nfse/:id
export const getNfseByIdSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

// GET /api/nfse (listagem)
export const searchNfseSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['pending', 'submitted', 'approved', 'rejected', 'cancelled', 'error']).optional(),
    cnpj: z.string().optional(),
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
  }),
};

export type SearchNfseQuery = z.infer<typeof searchNfseSchema.query>;
