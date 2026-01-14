import type { Request, Response } from 'express';
import { appService } from '../services/app.service.js';
import { paymentService } from '../services/payment.service.js';
import { success, sendError } from '../utils/response.js';
import type { CreateAppInput, UpdateAppInput, FeedbackInput } from '../schemas/app.schema.js';
import { logger } from '../utils/logger.js';

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

  async uploadExecutable(req: Request, res: Response): Promise<void> {
    const appId = Number(req.params.id);
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      sendError(res, 400, 'NO_FILE', 'Nenhum arquivo enviado');
      return;
    }

    try {
      const result = await appService.uploadExecutable(appId, file);
      res.json(success(result));
    } catch (error) {
      logger.error({ error, appId }, 'Erro ao fazer upload do executável');
      sendError(res, 500, 'UPLOAD_ERROR', 'Erro ao processar upload');
    }
  },

  async devInsert(req: Request, res: Response): Promise<void> {
    const creatorId = req.user?.id;
    if (!creatorId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Usuário não autenticado');
      return;
    }

    try {
      const data = req.body;
      const app = await appService.devInsert(data, creatorId);
      res.status(201).json(success(app));
    } catch (error) {
      logger.error({ error }, 'Erro na inserção de dev');
      sendError(res, 500, 'INSERT_ERROR', 'Erro ao inserir app');
    }
  },

  async webhook(req: Request, res: Response): Promise<void> {
    try {
      const { type, data } = req.body;
      const dataId = data?.id ? String(data.id) : null;

      if (!dataId) {
        res.status(200).json({ received: true, processed: false });
        return;
      }

      const result = await paymentService.handleWebhook(type, dataId);
      res.status(200).json({ received: true, ...result });
    } catch (error) {
      logger.error({ error }, 'Erro no webhook de apps');
      res.status(200).json({ received: true, error: 'Erro ao processar webhook' });
    }
  },

  async webhookVerify(_req: Request, res: Response): Promise<void> {
    // Verificação de webhook do Mercado Pago
    res.status(200).json({ status: 'ok', message: 'Webhook endpoint ativo' });
  },
};
