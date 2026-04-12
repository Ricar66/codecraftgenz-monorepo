import type { Request, Response } from 'express';
import { crafterService } from '../services/crafter.service.js';
import { success } from '../utils/response.js';
import type { CreateCrafterInput, UpdateCrafterInput } from '../schemas/crafter.schema.js';

export const crafterController = {
  async getAll(req: Request, res: Response) {
    const { page, limit, search, active_only, order_by, order_direction } = req.query;
    const result = await crafterService.getAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search as string | undefined,
      active_only: active_only === 'true' ? true : active_only === 'false' ? false : undefined,
      order_by: order_by as string | undefined,
      order_direction: order_direction === 'asc' ? 'asc' : 'desc',
    });
    // Return with pagination at top level so frontend can read response.pagination
    res.json({ success: true, ...result });
  },

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const crafter = await crafterService.getById(id);
    res.json(success(crafter));
  },

  async create(req: Request, res: Response) {
    const data = req.validated?.body as CreateCrafterInput;
    const crafter = await crafterService.create(data);
    res.status(201).json(success(crafter));
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.validated?.body as UpdateCrafterInput;
    const crafter = await crafterService.update(id, data);
    res.json(success(crafter));
  },

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await crafterService.delete(id);
    res.status(204).send();
  },

  async getRanking(req: Request, res: Response) {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const ranking = await crafterService.getRanking(limit);
    res.json(success(ranking));
  },

  async updatePoints(req: Request, res: Response) {
    const crafterId = Number(req.params.crafterId);
    const { pontos } = req.validated?.body as { pontos: number };
    const crafter = await crafterService.updatePoints(crafterId, pontos);
    res.json(success(crafter));
  },

  async updateTop3(req: Request, res: Response) {
    const { top3 } = req.validated?.body as { top3: Array<{ crafter_id: number; position: number }> };
    const result = await crafterService.updateTop3(top3);
    res.json(success(result));
  },

  async getTop3(_req: Request, res: Response) {
    const top3 = await crafterService.getTop3();
    res.json(success(top3));
  },

  async getAudit(_req: Request, res: Response) {
    const audit = await crafterService.getAudit();
    res.json(success(audit));
  },

  async updateFilters(req: Request, res: Response) {
    const filters = req.body as Record<string, unknown>;
    const result = await crafterService.updateFilters(filters);
    res.json(success(result));
  },
};
