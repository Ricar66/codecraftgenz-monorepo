import type { Request, Response } from 'express';
import { licenseService } from '../services/license.service.js';
import { success, sendError } from '../utils/response.js';
import type { ActivateDeviceInput, VerifyLicenseInput } from '../schemas/license.schema.js';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

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
    const appIdRaw = req.body?.app_id || req.query?.app_id;
    const email = req.body?.email || req.query?.email;
    const hardwareId = req.body?.hardware_id || req.query?.hardware_id || req.body?.pc_id || req.query?.pc_id || req.body?.id_pc || req.query?.id_pc;

    // Validar parâmetros obrigatórios
    if (!appIdRaw || isNaN(Number(appIdRaw))) {
      res.json({ success: false, valid: false, message: 'app_id é obrigatório e deve ser um número' });
      return;
    }
    if (!email) {
      res.json({ success: false, valid: false, message: 'email é obrigatório' });
      return;
    }
    if (!hardwareId) {
      res.json({ success: false, valid: false, message: 'hardware_id/id_pc é obrigatório' });
      return;
    }

    const data: VerifyLicenseInput = {
      app_id: Number(appIdRaw),
      app_name: req.body?.app_name || req.query?.app_name,
      email: String(email),
      hardware_id: String(hardwareId),
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
    const { email, payment_id } = req.validated?.body as { email: string; payment_id: string };
    const result = await licenseService.getDownloadUrl(appId, email, payment_id);
    res.json(success(result));
  },

  async downloadAuthenticated(req: Request, res: Response) {
    const appId = Number(req.params.id);
    const email = req.user!.email;
    const result = await licenseService.getDownloadUrl(appId, email);
    res.json(success(result));
  },

  /**
   * POST /api/apps/:id/download/by-payment
   * Download usando payment_id como prova de compra (sem autenticação)
   */
  async downloadByPaymentId(req: Request, res: Response): Promise<void> {
    const appId = Number(req.params.id);
    const { payment_id } = req.body;

    if (!payment_id) {
      sendError(res, 400, 'INVALID_INPUT', 'payment_id é obrigatório');
      return;
    }

    const result = await licenseService.getDownloadUrlByPaymentId(appId, String(payment_id));
    res.json(success(result));
  },

  /**
   * POST /api/apps/:id/download (público)
   * Aceita email ou payment_id no body, ou usa autenticação
   */
  async downloadPublic(req: Request, res: Response): Promise<void> {
    const appId = Number(req.params.id);
    const { email, payment_id } = req.body || {};

    // payment_id é sempre obrigatório — prova de posse da compra
    if (!payment_id) {
      sendError(res, 400, 'INVALID_INPUT', 'payment_id é obrigatório para download');
      return;
    }

    // Se tem email, valida email + payment_id juntos
    if (email) {
      const result = await licenseService.getDownloadUrl(appId, String(email), String(payment_id));
      res.json(success(result));
      return;
    }

    // Sem email, usa apenas payment_id
    const result = await licenseService.getDownloadUrlByPaymentId(appId, String(payment_id));
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

    // Resolver chave RSA: aceita PEM direto ou base64
    const privateKeyPem = env.PRIVATE_KEY_PEM ||
      (env.PRIVATE_KEY_PEM_B64 ? Buffer.from(env.PRIVATE_KEY_PEM_B64, 'base64').toString('utf8') : '');

    if (!privateKeyPem) {
      logger.error('PRIVATE_KEY_PEM não configurado — ativação de licença bloqueada');
      sendError(res, 500, 'CONFIG_ERROR', 'Serviço de licença não configurado. Contate o suporte.');
      return;
    }

    // Gerar assinatura RSA-SHA256
    let signature: string;
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(String(hardwareId));
      sign.update(String(userId));
      signature = sign.sign(privateKeyPem, 'base64');
    } catch (err) {
      logger.error({ err }, 'Falha ao assinar licença com chave RSA');
      sendError(res, 500, 'SIGN_ERROR', 'Erro ao gerar licença. Contate o suporte.');
      return;
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
