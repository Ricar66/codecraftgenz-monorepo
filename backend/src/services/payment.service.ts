import { paymentRepository } from '../repositories/payment.repository.js';
import { licenseService } from './license.service.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import type { PurchaseInput, DirectPaymentInput, SearchPaymentsQuery, UpdatePaymentInput } from '../schemas/payment.schema.js';
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

    // Nota: Removida verificação de compra duplicada para permitir
    // múltiplas compras (ex: para outras máquinas ou presentes)

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
      logger.error({
        hasMpClient: !!mpClient,
        hasPreference: !!Preference,
        hasAccessToken: !!env.MP_ACCESS_TOKEN,
      }, 'Mercado Pago não configurado para criar preferência');
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

    logger.info({
      appId,
      paymentId,
      preferenceId: mpResponse.id,
      initPoint: mpResponse.init_point ? 'presente' : 'AUSENTE',
      sandboxInitPoint: mpResponse.sandbox_init_point ? 'presente' : 'AUSENTE',
    }, 'Preferência MP criada');

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

  async getPurchaseStatus(appId: number, email?: string, preferenceId?: string, paymentId?: string) {
    // Helper para obter download_url do app
    const getAppDownloadUrl = async () => {
      const app = await prisma.app.findUnique({
        where: { id: appId },
        select: { executableUrl: true },
      });
      return app?.executableUrl || null;
    };

    // Buscar por payment_id interno (DIRECT-xxx, FREE-xxx, PAY-xxx)
    if (paymentId) {
      const payment = await paymentRepository.findById(paymentId);
      if (payment && payment.appId === appId) {
        const result: {
          status: string;
          payment_id: string;
          email?: string | null;
          download_url?: string | null;
        } = {
          status: payment.status,
          payment_id: payment.id,
          email: payment.payerEmail,
        };
        // Se aprovado, inclui download_url
        if (payment.status === 'approved') {
          result.download_url = await getAppDownloadUrl();
        }
        return result;
      }
    }

    if (preferenceId) {
      const payment = await paymentRepository.findByPreferenceId(preferenceId);
      if (payment) {
        const result: {
          status: string;
          payment_id: string;
          email?: string | null;
          download_url?: string | null;
        } = {
          status: payment.status,
          payment_id: payment.id,
          email: payment.payerEmail,
        };
        // Se aprovado, inclui download_url
        if (payment.status === 'approved') {
          result.download_url = await getAppDownloadUrl();
        }
        return result;
      }
    }

    if (email) {
      const payments = await paymentRepository.findByAppAndEmail(appId, email);
      const approved = payments.find((p) => p.status === 'approved');
      if (approved) {
        return {
          status: 'approved',
          payment_id: approved.id,
          email: approved.payerEmail,
          download_url: await getAppDownloadUrl(),
        };
      }

      const pending = payments.find((p) => p.status === 'pending');
      if (pending) {
        return {
          status: 'pending',
          payment_id: pending.id,
          email: pending.payerEmail,
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

    // Provisionar licença se aprovado (com proteção contra duplicação e erro)
    if (newStatus === 'approved' && oldStatus !== 'approved') {
      try {
        // Verificar se licença já existe (pode ter sido criada pelo pagamento direto)
        const existingLicense = await licenseService.getLicenseKeyByEmail(payment.appId, payment.payerEmail!);
        if (!existingLicense) {
          await licenseService.provisionLicense(
            payment.appId,
            payment.payerEmail!,
            payment.userId ?? undefined
          );
          logger.info({ paymentId: payment.id }, 'Licença provisionada via webhook');
        } else {
          logger.info({ paymentId: payment.id }, 'Licença já existe (provisionada pelo pagamento direto)');
        }
      } catch (licenseError) {
        logger.error({ error: licenseError, paymentId: payment.id }, 'Erro ao provisionar licença via webhook');
        // Não throw - webhook já processou pagamento com sucesso
      }
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

  async createDirectPayment(
    appId: number,
    data: DirectPaymentInput,
    userId?: number,
    options?: {
      ip?: string;
      idempotencyKey?: string;
      deviceId?: string;
      trackingId?: string;
    }
  ) {
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      throw AppError.notFound('App');
    }

    if (app.status !== 'published') {
      throw AppError.badRequest('Este app não está disponível para compra');
    }

    const payerEmail = data.payer.email;

    // Nota: Removida verificação de compra duplicada para permitir
    // múltiplas compras (ex: para outras máquinas ou presentes)

    // Se app é gratuito, aprovar diretamente
    const amount = Number(app.price || 0);
    if (amount === 0) {
      const paymentId = `FREE-${crypto.randomUUID()}`;
      await paymentRepository.create({
        id: paymentId,
        appId,
        userId,
        status: 'approved',
        amount: 0,
        currency: 'BRL',
        payerEmail,
        payerName: `${data.payer.first_name || ''} ${data.payer.last_name || ''}`.trim() || undefined,
      });

      await licenseService.provisionLicense(appId, payerEmail, userId);

      return {
        success: true,
        payment_id: paymentId,
        status: 'approved',
        license_key: await licenseService.getLicenseKeyByEmail(appId, payerEmail),
      };
    }

    // Verificar configuração do Mercado Pago
    if (!env.MP_ACCESS_TOKEN) {
      throw AppError.internal('Mercado Pago não configurado');
    }

    const paymentId = `DIRECT-${crypto.randomUUID()}`;
    const idempotencyKey = options?.idempotencyKey || `app-${appId}-user-${userId || 'anon'}-${Date.now()}`;

    // Determinar processing mode
    const processingMode = (process.env.MERCADO_PAGO_PROCESSING_MODE || 'aggregator').toLowerCase();
    const finalProcessingMode = ['aggregator', 'gateway'].includes(processingMode) ? processingMode : 'aggregator';

    // Montar items para additional_info
    const items = [
      {
        id: `APP-${appId}`,
        title: app.name,
        description: app.shortDescription || app.description?.substring(0, 200) || 'Aplicativo CodeCraft',
        picture_url: app.thumbUrl || undefined,
        category_id: 'software',
        quantity: 1,
        unit_price: amount,
        type: 'software',
      },
    ];

    // Montar payload de pagamento
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      description: data.description || `Pagamento do app ${app.name}`,
      external_reference: data.external_reference || String(paymentId),
      transaction_amount: amount,
      payment_method_id: data.payment_method_id,
      ...(data.installments && data.installments > 0 ? { installments: data.installments } : {}),
      ...(data.issuer_id ? { issuer_id: data.issuer_id } : {}),
      ...(data.token ? { token: data.token } : {}),
      payer: {
        email: payerEmail,
        ...(data.payer.first_name ? { first_name: data.payer.first_name } : {}),
        ...(data.payer.last_name ? { last_name: data.payer.last_name } : {}),
        ...(data.payer.identification?.type && data.payer.identification?.number
          ? { identification: data.payer.identification }
          : {}),
      },
      additional_info: {
        ...(data.additional_info || {}),
        items,
        payer: {
          first_name: data.payer.first_name,
          last_name: data.payer.last_name,
        },
        ip_address: options?.ip || '',
      },
      binary_mode: data.binary_mode ?? false,
      processing_mode: finalProcessingMode,
      capture: data.capture ?? true,
      metadata: { source: 'codecraft', ...(data.metadata || {}) },
      notification_url: env.MP_WEBHOOK_URL,
    };

    // Chamar API de pagamentos do Mercado Pago
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    };

    if (options?.deviceId) {
      headers['X-Device-Id'] = options.deviceId;
    }
    if (options?.trackingId) {
      headers['X-Tracking-Id'] = options.trackingId;
    }

    let mpResponse;
    try {
      const resp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      try {
        mpResponse = JSON.parse(text);
      } catch {
        mpResponse = { raw: text };
      }

      if (!resp.ok) {
        logger.warn({ status: resp.status, error: mpResponse }, 'Falha ao criar pagamento direto');
        throw AppError.badRequest(
          mpResponse?.message || 'Falha ao processar pagamento',
          { mp_status: resp.status, details: mpResponse }
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ error }, 'Erro de rede ao criar pagamento direto');
      throw AppError.internal('Falha de rede ao processar pagamento');
    }

    // Extrair dados principais
    const mpPaymentId = String(mpResponse.id || mpResponse.payment_id || paymentId);
    const status = mpResponse.status || 'pending';
    const statusDetail = mpResponse.status_detail || null;

    // Persistir no banco
    await paymentRepository.create({
      id: paymentId,
      appId,
      userId,
      preferenceId: mpPaymentId,
      status: mapMpStatus(status),
      amount,
      currency: mpResponse.currency_id || 'BRL',
      payerEmail,
      payerName: `${data.payer.first_name || ''} ${data.payer.last_name || ''}`.trim() || undefined,
      mpResponseJson: JSON.stringify(mpResponse),
    });

    // Se aprovado, provisionar licença (com proteção contra duplicação e erro)
    if (status === 'approved') {
      try {
        // Usar lock via flag no payment para evitar race condition com webhook
        const existingLicense = await licenseService.getLicenseKeyByEmail(appId, payerEmail);
        if (!existingLicense) {
          await licenseService.provisionLicense(appId, payerEmail, userId);
          logger.info({ paymentId, appId, email: payerEmail }, 'Licença provisionada via pagamento direto');
        } else {
          logger.info({ paymentId, appId, email: payerEmail }, 'Licença já existe - pulando provisionamento');
        }
      } catch (licenseError) {
        // Log erro mas não falha o pagamento - webhook pode tentar novamente
        logger.error({ error: licenseError, paymentId, appId }, 'Erro ao provisionar licença (pagamento direto)');
      }
    }

    // Retornar resposta completa
    return {
      success: true,
      payment_id: paymentId,
      mp_payment_id: mpPaymentId,
      status,
      status_detail: statusDetail,
      result: mpResponse,
      // Dados para PIX
      point_of_interaction: mpResponse.point_of_interaction,
      qr_code: mpResponse.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: mpResponse.point_of_interaction?.transaction_data?.ticket_url,
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
