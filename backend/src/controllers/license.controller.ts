import type { Request, Response } from 'express';
import { licenseService } from '../services/license.service.js';
import { success, sendError } from '../utils/response.js';
import type { ActivateDeviceInput, VerifyLicenseInput } from '../schemas/license.schema.js';
import crypto from 'crypto';
import { env } from '../config/env.js';

export const licenseController = {
  async activateDevice(req: Request, res: Response) {
    const data = req.validated?.body as ActivateDeviceInput;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await licenseService.activateDevice(data, ip, userAgent);
    res.json(success(result));
  },

  async verifyLicense(req: Request, res: Response) {
    const data = req.validated?.body as VerifyLicenseInput;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await licenseService.verifyLicense(data, ip, userAgent);
    res.json(success(result));
  },

  async compatLicenseCheck(req: Request, res: Response) {
    // Compatibilidade com formato antigo (GET e POST)
    const data: VerifyLicenseInput = {
      app_id: Number(req.body?.app_id || req.query?.app_id),
      app_name: req.body?.app_name || req.query?.app_name,
      email: req.body?.email || req.query?.email,
      hardware_id: req.body?.hardware_id || req.query?.hardware_id || req.body?.pc_id || req.query?.pc_id,
    };

    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await licenseService.verifyLicense(data, ip, userAgent);
    res.json(success(result));
  },

  async claimByEmail(req: Request, res: Response) {
    const { email } = req.validated?.body as { email: string };
    const licenses = await licenseService.claimByEmail(email);
    res.json(success(licenses));
  },

  async getPurchasesByEmail(req: Request, res: Response) {
    const email = req.query.email as string;
    const appId = req.query.app_id ? Number(req.query.app_id) : undefined;
    const purchases = await licenseService.getPurchasesByEmail(email, appId);
    res.json(success(purchases));
  },

  async downloadByEmail(req: Request, res: Response) {
    const appId = Number(req.params.id);
    const { email } = req.validated?.body as { email: string };
    const result = await licenseService.getDownloadUrl(appId, email);
    res.json(success(result));
  },

  async downloadAuthenticated(req: Request, res: Response) {
    const appId = Number(req.params.id);
    const email = req.user!.email;
    const result = await licenseService.getDownloadUrl(appId, email);
    res.json(success(result));
  },

  /**
   * POST /api/licenses/activate
   * Ativação de licença com autenticação (gera assinatura RSA se disponível)
   */
  async activateAuthenticated(req: Request, res: Response): Promise<void> {
    const { appId, hardwareId } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!appId || !hardwareId) {
      sendError(res, 400, 'INVALID_INPUT', 'appId e hardwareId são obrigatórios');
      return;
    }

    if (!userId || !userEmail) {
      sendError(res, 401, 'UNAUTHORIZED', 'Usuário não autenticado');
      return;
    }

    // Verificar se o usuário tem licença válida
    const hasLicense = await licenseService.checkUserLicense(userId, Number(appId));
    if (!hasLicense) {
      sendError(res, 403, 'NO_LICENSE', 'Sem licença válida para este app');
      return;
    }

    // Gerar assinatura
    let signature: string;
    const privateKeyPem = env.PRIVATE_KEY_PEM || process.env.PRIVATE_KEY_PEM || '';

    if (privateKeyPem) {
      try {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(String(hardwareId));
        sign.update(String(userId));
        signature = sign.sign(privateKeyPem, 'base64');
      } catch {
        // Fallback para assinatura simples
        signature = 'LIC-' + Buffer.from(hardwareId + userId).toString('base64');
      }
    } else {
      signature = 'LIC-' + Buffer.from(hardwareId + userId).toString('base64');
    }

    // Registrar ativação
    await licenseService.registerActivation({
      userId,
      appId: Number(appId),
      email: userEmail,
      hardwareId: String(hardwareId),
      licenseKey: signature,
    });

    res.json(success({ license_key: signature }));
  },
};
