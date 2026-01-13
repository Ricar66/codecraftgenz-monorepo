import type { Request, Response } from 'express';
import { licenseService } from '../services/license.service.js';
import { success } from '../utils/response.js';
import type { ActivateDeviceInput, VerifyLicenseInput } from '../schemas/license.schema.js';

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
};
