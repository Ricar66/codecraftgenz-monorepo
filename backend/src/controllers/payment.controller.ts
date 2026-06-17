import type { Request, Response } from 'express';
import { paymentService } from '../services/payment.service.js';
import { asaasProvider } from '../services/asaas.service.js';
import { success, paginated, sendError } from '../utils/response.js';
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

    // Sem auth: exigir payment_id ou preference_id (não aceitar busca apenas por email)
    if (!req.user && !paymentId && !preferenceId) {
      sendError(res, 401, 'AUTH_REQUIRED', 'Autenticação ou payment_id/preference_id necessário');
      return;
    }

    const result = await paymentService.getPurchaseStatus(appId, email, preferenceId, paymentId);
    res.json(success(result));
  },

  async webhook(req: Request, res: Response) {
    // Valida o token do webhook Asaas (header `asaas-access-token`), timing-safe.
    if (env.ASAAS_WEBHOOK_TOKEN) {
      const token = req.headers['asaas-access-token'] as string | undefined;
      if (!asaasProvider.verifyWebhookToken(token)) {
        logger.warn('Webhook Asaas com token inválido/ausente — rejeitado');
        res.status(401).json({ error: 'Token inválido' });
        return;
      }
    } else if (process.env.NODE_ENV === 'production') {
      logger.error('ASAAS_WEBHOOK_TOKEN não configurado em produção - webhook rejeitado');
      res.status(500).json({ error: 'Webhook token não configurado' });
      return;
    } else {
      logger.warn('ASAAS_WEBHOOK_TOKEN não configurado - webhook aceito sem validação (dev only)');
    }

    // Corpo Asaas: { event: 'PAYMENT_CONFIRMED', payment: { id, status, externalReference, ... } }
    const event = typeof req.body?.event === 'string' ? req.body.event : null;
    const chargeId = req.body?.payment?.id ? String(req.body.payment.id) : null;

    if (!event || !chargeId) {
      res.status(200).json({ received: true, processed: false });
      return;
    }

    const result = await paymentService.handleWebhook(event, chargeId);
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
