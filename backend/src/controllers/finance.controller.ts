import type { Request, Response } from 'express';
import { financeService } from '../services/finance.service.js';
import type { CreateFinanceInput, UpdateFinanceInput } from '../services/finance.service.js';
import { success } from '../utils/response.js';

export const financeController = {
  async getAll(_req: Request, res: Response) {
    const finances = await financeService.getAll();
    res.json(success(finances));
  },

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const finance = await financeService.getById(id);
    res.json(success(finance));
  },

  async create(req: Request, res: Response) {
    const data = req.body as CreateFinanceInput;
    const finance = await financeService.create(data);
    res.status(201).json(success(finance));
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.body as UpdateFinanceInput;
    const finance = await financeService.update(id, data);
    res.json(success(finance));
  },

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await financeService.delete(id);
    res.status(204).send();
  },
};
