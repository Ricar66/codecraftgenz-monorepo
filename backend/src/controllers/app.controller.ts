import type { Request, Response } from 'express';
import { appService } from '../services/app.service.js';
import { success } from '../utils/response.js';
import type { CreateAppInput, UpdateAppInput, FeedbackInput } from '../schemas/app.schema.js';

export const appController = {
  async getAll(_req: Request, res: Response) {
    const apps = await appService.getAll();
    res.json(success(apps));
  },

  async getPublic(_req: Request, res: Response) {
    const apps = await appService.getPublic();
    res.json(success(apps));
  },

  async getMine(req: Request, res: Response) {
    const userId = req.user!.id;
    const apps = await appService.getByCreator(userId);
    res.json(success(apps));
  },

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const app = await appService.getById(id);
    res.json(success(app));
  },

  async create(req: Request, res: Response) {
    const data = req.validated?.body as CreateAppInput;
    const creatorId = req.user!.id;
    const app = await appService.create(data, creatorId);
    res.status(201).json(success(app));
  },

  async createFromProject(req: Request, res: Response) {
    const projectId = Number(req.params.projectId);
    const creatorId = req.user!.id;
    const body = req.validated?.body as { price?: number; status?: string } | undefined;
    const app = await appService.createFromProject(projectId, creatorId, {
      price: body?.price,
      status: body?.status
    });
    res.status(201).json(success(app));
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.validated?.body as UpdateAppInput;
    const app = await appService.update(id, data);
    res.json(success(app));
  },

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await appService.delete(id);
    res.status(204).send();
  },

  async addFeedback(req: Request, res: Response) {
    const appId = Number(req.params.id);
    const userId = req.user!.id;
    const data = req.validated?.body as FeedbackInput;
    const feedback = await appService.addFeedback(appId, userId, data);
    res.status(201).json(success(feedback));
  },

  async getHistory(_req: Request, res: Response) {
    const history = await appService.getHistory();
    res.json(success(history));
  },
};
