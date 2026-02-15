import type { Request, Response } from 'express';
import { hubService } from '../services/hub.service.js';
import { success, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const hubController = {
  async getMyApps(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userEmail = req.user!.email;

      const userRole = req.user!.role;
      const apps = await hubService.getAppsWithLicenseStatus(userId, userEmail, userRole);
      res.json(success({ apps }));
    } catch (error) {
      logger.error({ error }, 'Erro ao buscar apps do hub');
      sendError(res, 500, 'HUB_ERROR', 'Erro ao carregar apps');
    }
  },
};
