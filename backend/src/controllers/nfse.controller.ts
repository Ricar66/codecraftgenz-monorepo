// src/controllers/nfse.controller.ts
// Controller fino para NFS-e - delega logica ao service

import type { Request, Response } from 'express';
import { nfseService } from '../services/nfse.service.js';
import { success, paginated } from '../utils/response.js';
import type { CreateNfseInput, SearchNfseQuery } from '../schemas/nfse.schema.js';

export const nfseController = {
  /**
   * POST /api/nfse/gerar - Cria invoice a partir dos dados da venda
   */
  async gerar(req: Request, res: Response) {
    const data = req.validated?.body as CreateNfseInput;
    const invoice = await nfseService.gerarInvoice(data);
    res.status(201).json(success(invoice));
  },

  /**
   * POST /api/nfse/:id/enviar - Envia RPS para a prefeitura
   */
  async enviar(req: Request, res: Response) {
    const id = req.params.id as string;
    const invoice = await nfseService.enviarParaPrefeitura(id);
    res.json(success(invoice));
  },

  /**
   * GET /api/nfse/:id/consultar - Consulta status do lote na prefeitura
   */
  async consultar(req: Request, res: Response) {
    const id = req.params.id as string;
    const invoice = await nfseService.consultarLote(id);
    res.json(success(invoice));
  },

  /**
   * POST /api/nfse/:id/cancelar - Cancela NFS-e na prefeitura
   */
  async cancelar(req: Request, res: Response) {
    const id = req.params.id as string;
    const invoice = await nfseService.cancelarNfse(id);
    res.json(success(invoice));
  },

  /**
   * GET /api/nfse/:id - Busca invoice por ID
   */
  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const invoice = await nfseService.buscarPorId(id);
    res.json(success(invoice));
  },

  /**
   * GET /api/nfse - Lista invoices com paginacao
   */
  async search(req: Request, res: Response) {
    const query = req.validated?.query as SearchNfseQuery;
    const result = await nfseService.listar(query);
    res.json(paginated(result.items, result.page, result.limit, result.total));
  },

  /**
   * GET /api/nfse/:id/xml - Retorna XML da NFS-e
   */
  async getXml(req: Request, res: Response) {
    const id = req.params.id as string;
    const xml = await nfseService.buscarXml(id);
    res.json(success(xml));
  },
};
