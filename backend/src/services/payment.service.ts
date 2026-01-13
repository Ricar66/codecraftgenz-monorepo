import { paymentRepository } from '../repositories/payment.repository.js';
import { licenseService } from './license.service.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import type { PurchaseInput, SearchPaymentsQuery, UpdatePaymentInput } from '../schemas/payment.schema.js';
import { prisma } from '../db/prisma.js';
import crypto from 'crypto';

// Mercado Pago SDK - importação condicional
let MercadoPagoConfig: unknown;
let Preference: unknown;
let Payment: unknown;

try {
  const mp = await import('mercadopago');
  MercadoPagoConfig = mp.MercadoPagoConfig;
  Preference = mp.Preference;
  Payment = mp.Payment;
} catch {
  logger.warn('Mercado Pago SDK não disponível');
}

const mpClient = env.MP_ACCESS_TOKEN && MercadoPagoConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ? new (MercadoPagoConfig as any)({ accessToken: env.MP_ACCESS_TOKEN })
  : null;

export const paymentService = {
  async search(query: SearchPaymentsQuery) {
    const { payments, total, page, limit } = await paymentRepository.findAll(query);
    return {
      items: payments.map(mapPayment),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw AppError.notFound('Pagamento');
    }
    return mapPayment(payment);
  },

  async updateStatus(id: string, data: UpdatePaymentInput) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw AppError.notFound('Pagamento');
    }

    const updated = await paymentRepository.updateStatus(id, data.status);

    // Se aprovado, provisionar licença
    if (data.status === 'approved' && payment.status !== 'approved') {
      await licenseService.provisionLicense(
        payment.appId,
        payment.payerEmail!,
        payment.userId ?? undefined
      );
    }

    return mapPayment(updated);
  },

  async createPurchase(appId: number, data: PurchaseInput, userId?: number) {
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      throw AppError.notFound('App');
    }

    if (app.status !== 'published') {
      throw AppError.badRequest('Este app não está disponível para compra');
    }

    // Verificar se já tem compra aprovada
    const existingApproved = await paymentRepository.countApprovedByEmailAndApp(
      data.email,
      appId
    );

    if (existingApproved > 0) {
      throw AppError.conflict('Você já possui este app');
    }

    // Se app é gratuito, aprovar diretamente
    if (Number(app.price) === 0) {
      const paymentId = `FREE-${crypto.randomUUID()}`;
      const payment = await paymentRepository.create({
        id: paymentId,
        appId,
        userId,
        status: 'approved',
        amount: 0,
        currency: 'BRL',
        payerEmail: data.email,
        payerName: data.name,
      });

      await licenseService.provisionLicense(appId, data.email, userId);

      return {
        payment_id: payment.id,
        status: 'approved',
        init_point: null,
        sandbox_init_point: null,
      };
    }

    // Criar preferência no Mercado Pago
    if (!mpClient || !Preference) {
      throw AppError.internal('Mercado Pago não configurado');
    }

    const paymentId = `PAY-${crypto.randomUUID()}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preference = new (Preference as any)(mpClient);

    const preferenceData = {
      items: [
        {
          id: String(app.id),
          title: app.name,
          description: app.shortDescription || app.description?.substring(0, 200) || '',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(app.price),
        },
      ],
      payer: {
        email: data.email,
        name: data.name,
      },
      back_urls: {
        success: env.MP_SUCCESS_URL?.replace(':id', String(appId)),
        failure: env.MP_FAILURE_URL?.replace(':id', String(appId)),
        pending: env.MP_PENDING_URL?.replace(':id', String(appId)),
      },
      auto_return: 'approved',
      external_reference: paymentId,
      notification_url: env.MP_WEBHOOK_URL,
    };

    const mpResponse = await preference.create({ body: preferenceData });

    await paymentRepository.create({
      id: paymentId,
      appId,
      userId,
      preferenceId: mpResponse.id,
      status: 'pending',
      amount: Number(app.price),
      currency: 'BRL',
      payerEmail: data.email,
      payerName: data.name,
      mpResponseJson: JSON.stringify(mpResponse),
    });

    return {
      payment_id: paymentId,
      preference_id: mpResponse.id,
      status: 'pending',
      init_point: mpResponse.init_point,
      sandbox_init_point: mpResponse.sandbox_init_point,
    };
  },

  async getPurchaseStatus(appId: number, email?: string, preferenceId?: string) {
    if (preferenceId) {
      const payment = await paymentRepository.findByPreferenceId(preferenceId);
      if (payment) {
        return {
          status: payment.status,
          payment_id: payment.id,
        };
      }
    }

    if (email) {
      const payments = await paymentRepository.findByAppAndEmail(appId, email);
      const approved = payments.find((p) => p.status === 'approved');
      if (approved) {
        return {
          status: 'approved',
          payment_id: approved.id,
        };
      }

      const pending = payments.find((p) => p.status === 'pending');
      if (pending) {
        return {
          status: 'pending',
          payment_id: pending.id,
        };
      }
    }

    return { status: 'not_found', payment_id: null };
  },

  async handleWebhook(type: string, dataId: string) {
    logger.info({ type, dataId }, 'Webhook recebido');

    if (type !== 'payment') {
      return { processed: false, reason: 'Tipo não é payment' };
    }

    if (!mpClient || !Payment) {
      logger.warn('Mercado Pago não configurado para processar webhook');
      return { processed: false, reason: 'MP não configurado' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentApi = new (Payment as any)(mpClient);
    const mpPayment = await paymentApi.get({ id: dataId });

    if (!mpPayment) {
      return { processed: false, reason: 'Pagamento não encontrado no MP' };
    }

    const externalRef = mpPayment.external_reference;
    const payment = await paymentRepository.findById(externalRef);

    if (!payment) {
      logger.warn({ externalRef }, 'Pagamento não encontrado no banco');
      return { processed: false, reason: 'Pagamento não encontrado' };
    }

    const oldStatus = payment.status;
    const newStatus = mapMpStatus(mpPayment.status);

    if (oldStatus === newStatus) {
      return { processed: true, reason: 'Status já atualizado' };
    }

    await paymentRepository.updateStatus(
      payment.id,
      newStatus,
      JSON.stringify(mpPayment)
    );

    // Provisionar licença se aprovado
    if (newStatus === 'approved' && oldStatus !== 'approved') {
      await licenseService.provisionLicense(
        payment.appId,
        payment.payerEmail!,
        payment.userId ?? undefined
      );
      logger.info({ paymentId: payment.id }, 'Licença provisionada via webhook');
    }

    return {
      processed: true,
      payment_id: payment.id,
      old_status: oldStatus,
      new_status: newStatus,
    };
  },

  async getLastByApp(appId: number) {
    const payment = await paymentRepository.findLastByApp(appId);
    if (!payment) return null;
    return mapPayment(payment);
  },

  async getAppPaymentsAdmin(appId?: number, page = 1, limit = 20) {
    const { payments, total } = await paymentRepository.getAppPaymentsAdmin(appId, page, limit);
    return {
      items: payments.map(mapPayment),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },
};

function mapPayment(payment: {
  id: string;
  appId: number;
  userId: number | null;
  preferenceId: string | null;
  status: string;
  amount: unknown;
  currency: string;
  payerEmail: string | null;
  payerName: string | null;
  mpResponseJson: string | null;
  createdAt: Date;
  updatedAt: Date;
  app?: { id: number; name: string; price?: unknown } | null;
  user?: { id: number; name: string; email: string } | null;
}) {
  return {
    id: payment.id,
    app_id: payment.appId,
    user_id: payment.userId,
    preference_id: payment.preferenceId,
    status: payment.status,
    amount: Number(payment.amount),
    currency: payment.currency,
    payer_email: payment.payerEmail,
    payer_name: payment.payerName,
    app: payment.app
      ? { id: payment.app.id, name: payment.app.name }
      : null,
    user: payment.user
      ? { id: payment.user.id, name: payment.user.name, email: payment.user.email }
      : null,
    created_at: payment.createdAt,
    updated_at: payment.updatedAt,
  };
}

function mapMpStatus(mpStatus: string): string {
  const statusMap: Record<string, string> = {
    approved: 'approved',
    pending: 'pending',
    authorized: 'pending',
    in_process: 'pending',
    in_mediation: 'pending',
    rejected: 'rejected',
    cancelled: 'cancelled',
    refunded: 'refunded',
    charged_back: 'refunded',
  };
  return statusMap[mpStatus] || 'pending';
}
