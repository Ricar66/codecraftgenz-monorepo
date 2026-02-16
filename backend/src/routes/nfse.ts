// src/routes/nfse.ts
// Rotas para NFS-e (Nota Fiscal de Servico Eletronica)

import { Router } from 'express';
import { nfseController } from '../controllers/nfse.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createNfseSchema,
  cancelarNfseSchema,
  getNfseByIdSchema,
  searchNfseSchema,
} from '../schemas/nfse.schema.js';

const router = Router();

// Todas as rotas exigem autenticacao + admin
// POST /api/nfse/gerar - Cria invoice a partir dos dados da venda
router.post(
  '/gerar',
  authenticate,
  authorizeAdmin,
  validate(createNfseSchema),
  nfseController.gerar,
);

// GET /api/nfse - Lista invoices com paginacao e filtros
router.get(
  '/',
  authenticate,
  authorizeAdmin,
  validate(searchNfseSchema),
  nfseController.search,
);

// GET /api/nfse/:id - Busca invoice por ID
router.get(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(getNfseByIdSchema),
  nfseController.getById,
);

// GET /api/nfse/:id/xml - Retorna XML da NFS-e
router.get(
  '/:id/xml',
  authenticate,
  authorizeAdmin,
  validate(getNfseByIdSchema),
  nfseController.getXml,
);

// POST /api/nfse/:id/enviar - Envia RPS para a prefeitura via SOAP
router.post(
  '/:id/enviar',
  authenticate,
  authorizeAdmin,
  validate(getNfseByIdSchema),
  nfseController.enviar,
);

// GET /api/nfse/:id/consultar - Consulta status do lote na prefeitura
router.get(
  '/:id/consultar',
  authenticate,
  authorizeAdmin,
  validate(getNfseByIdSchema),
  nfseController.consultar,
);

// POST /api/nfse/:id/cancelar - Cancela NFS-e na prefeitura
router.post(
  '/:id/cancelar',
  authenticate,
  authorizeAdmin,
  validate(cancelarNfseSchema),
  nfseController.cancelar,
);

export default router;
