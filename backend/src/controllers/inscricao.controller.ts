import type { Request, Response } from 'express';
import { inscricaoService } from '../services/inscricao.service.js';
import { success } from '../utils/response.js';
import type { CreateInscricaoInput, UpdateInscricaoStatusInput } from '../schemas/inscricao.schema.js';

export const inscricaoController = {
  async getAll(_req: Request, res: Response) {
    const inscricoes = await inscricaoService.getAll();
    res.json(success(inscricoes));
  },

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const inscricao = await inscricaoService.getById(id);
    res.json(success(inscricao));
  },

  async create(req: Request, res: Response) {
    const data = req.validated?.body as CreateInscricaoInput;
    const inscricao = await inscricaoService.create(data);
    res.status(201).json(success(inscricao));
  },

  async updateStatus(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.validated?.body as UpdateInscricaoStatusInput;
    const inscricao = await inscricaoService.updateStatus(id, data);
    res.json(success(inscricao));
  },

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await inscricaoService.delete(id);
    res.status(204).send();
  },
};
