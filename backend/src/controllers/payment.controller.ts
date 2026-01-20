import type { Request, Response } from 'express';
import crypto from 'crypto';
import { paymentService } from '../services/payment.service.js';
import { success, paginated } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import type { PurchaseInput, DirectPaymentInput, UpdatePaymentInput, SearchPaymentsQuery } from '../schemas/payment.schema.js';

export const paymentController = {
  async search(req: Request, res: Response) {
    const query = req.validated?.query as SearchPaymentsQuery;
    const result = await paymentService.search(query);
    res.json(paginated(result.items, result.page, result.limit, result.total));
  },

  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const payment = await paymentService.getById(id);
    res.json(success(payment));
  },

  async updateStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const data = req.validated?.body as UpdatePaymentInput;
    const payment = await paymentService.updateStatus(id, data);
    res.json(success(payment));
  },

  async purchase(req: Request, res: Response) {
    const appId = Number(req.params.id);
    const data = req.validated?.body as PurchaseInput;
    const userId = req.user?.id;
    const result = await paymentService.createPurchase(appId, data, userId);
    res.status(201).json(success(result));
  },

  async getPurchaseStatus(req: Request, res: Response) {
    const appId = Number(req.params.id);
    const email = req.query.email as string | undefined;
    const preferenceId = req.query.preference_id as string | undefined;
    const paymentId = req.query.payment_id as string | undefined;
    const result = await paymentService.getPurchaseStatus(appId, email, preferenceId, paymentId);
    res.json(success(result));
  },

  async webhook(req: Request, res: Response) {
    // Validar assinatura do Mercado Pago (se configurado)
    const webhookSecret = env.MP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const xSignature = req.headers['x-signature'] as string;
      const xRequestId = req.headers['x-request-id'] as string;

      if (!xSignature || !xRequestId) {
        logger.warn({ headers: Object.keys(req.headers) }, 'Webhook sem assinatura - rejeitado');
        res.status(401).json({ error: 'Assinatura ausente' });
        return;
      }

      // Extrair ts e v1 do header x-signature
      // Formato: ts=xxx,v1=xxx
      const parts = xSignature.split(',');
      const tsMatch = parts.find(p => p.startsWith('ts='));
      const v1Match = parts.find(p => p.startsWith('v1='));

      const ts = tsMatch?.split('=')[1];
      const v1 = v1Match?.split('=')[1];

      if (!ts || !v1) {
        logger.warn({ xSignature }, 'Formato de assinatura inválido');
        res.status(401).json({ error: 'Formato de assinatura inválido' });
        return;
      }

      // Montar template para verificação
      // O template é: id:[data.id];request-id:[x-request-id];ts:[ts];
      const dataId = req.body?.data?.id;
      const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

      // Gerar HMAC SHA256 com o webhook secret
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(template)
        .digest('hex');

      if (v1 !== expectedSignature) {
        logger.warn({ expected: expectedSignature, received: v1 }, 'Assinatura de webhook inválida');
        res.status(401).json({ error: 'Assinatura inválida' });
        return;
      }

      logger.info({ requestId: xRequestId }, 'Assinatura de webhook validada');
    } else {
      logger.warn('MP_WEBHOOK_SECRET não configurado - webhook aceito sem validação');
    }

    const { type, data } = req.body;
    const dataId = data?.id ? String(data.id) : null;

    if (!dataId) {
      res.status(200).json({ received: true, processed: false });
      return;
    }

    const result = await paymentService.handleWebhook(type, dataId);
    res.status(200).json({ received: true, ...result });
  },

  async getLastByApp(req: Request, res: Response) {
    const appId = Number(req.params.id);
    const payment = await paymentService.getLastByApp(appId);
    res.json(success(payment));
  },

  async getAppPaymentsAdmin(req: Request, res: Response) {
    const appId = req.query.app_id ? Number(req.query.app_id) : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await paymentService.getAppPaymentsAdmin(appId, page, limit);
    res.json(paginated(result.items, result.page, result.limit, result.total));
  },

  async getAppPaymentById(req: Request, res: Response) {
    const pid = req.params.pid as string;
    const payment = await paymentService.getById(pid);
    res.json(success(payment));
  },

  async directPayment(req: Request, res: Response) {
    const appId = Number(req.params.id);
    const data = req.validated?.body as DirectPaymentInput;
    const userId = req.user?.id;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '';
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    const deviceId = (req.headers['x-device-id'] || req.headers['x-mp-device-id']) as string | undefined;
    const trackingId = req.headers['x-tracking-id'] as string | undefined;

    const result = await paymentService.createDirectPayment(appId, data, userId, {
      ip,
      idempotencyKey,
      deviceId,
      trackingId,
    });
    res.status(201).json(success(result));
  },

  async resendConfirmationEmail(req: Request, res: Response) {
    const appId = Number(req.params.id);
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: { message: 'Email é obrigatório' } });
      return;
    }

    const result = await paymentService.resendConfirmationEmail(appId, email);
    res.json(success(result));
  },
};
