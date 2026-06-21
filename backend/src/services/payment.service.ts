import { paymentRepository } from '../repositories/payment.repository.js';
import { licenseService } from './license.service.js';
import { userService } from './user.service.js';
import { emailService } from './email.service.js';
import { asaasProvider } from './asaas.service.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { maskEmail } from '../utils/crypto.js';
import { env } from '../config/env.js';
import type { PurchaseInput, DirectPaymentInput, SearchPaymentsQuery, UpdatePaymentInput } from '../schemas/payment.schema.js';
import { prisma } from '../db/prisma.js';
import crypto from 'crypto';

/** Vencimento padrão da cobrança Asaas: hoje + 1 dia (yyyy-MM-dd). */
function defaultDueDate(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * Emite NFSe via Asaas garantindo UMA ÚNICA nota por cobrança (idempotência por chargeId).
 *
 * Trava otimista em ProcessedWebhook com chave `NFSE:<chargeId>`. Como os eventos Asaas
 * (PAYMENT_CONFIRMED depois PAYMENT_RECEIVED), as 4 réplicas e o caminho de ativação manual
 * (updateStatus) compartilham a MESMA chave por cobrança, apenas o primeiro emite — os demais
 * caem no P2002 e param. Sem isso, dois `POST /v3/invoices` para a mesma cobrança geram dois
 * números de RPS e a prefeitura rejeita o segundo com "RPS já utilizado". Non-blocking.
 */
async function emitNfseOnce(chargeId: string, value: number, serviceDescription: string): Promise<void> {
  const nfseKey = `NFSE:${chargeId}`;
  try {
    await prisma.processedWebhook.create({ data: { externalId: nfseKey, action: 'NFSE_EMIT' } });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') {
      logger.info({ chargeId }, 'NFSe já emitida/em emissão para esta cobrança — ignorando (idempotência)');
    } else {
      logger.warn({ err, chargeId }, 'Falha ao travar emissão de NFSe — abortando para evitar nota duplicada');
    }
    return; // fail-safe: se não venceu a trava, NÃO emite (evita duplicidade de RPS)
  }
  await asaasProvider.scheduleInvoice({ chargeId, value, serviceDescription });
}

/**
 * Processa eventos INVOICE_* do Asaas. Se a nota falhou na prefeitura (status ERROR),
 * loga e ALERTA o time por email — antes a emissão era fire-and-forget e a nota travava
 * em ERROR sem ninguém saber. Requer os eventos INVOICE_* habilitados no webhook do Asaas.
 */
async function handleInvoiceEvent(invoiceId: string): Promise<void> {
  try {
    const inv = await asaasProvider.getInvoice(invoiceId);
    if (!inv) return;
    if (String(inv.status).toUpperCase() !== 'ERROR') return;
    const rps = [
      (inv as { rpsSerie?: string }).rpsSerie,
      (inv as { rpsNumber?: number }).rpsNumber,
    ]
      .filter((v) => v !== undefined && v !== null)
      .join('/');
    const description = (inv as { statusDescription?: string }).statusDescription;
    const chargeId = (inv as { payment?: string }).payment || '—';
    logger.error({ invoiceId, chargeId, rps, description }, '🚨 NFSe em ERRO na prefeitura');
    await emailService.sendNfseErrorAlert({ chargeId, invoiceId, rps, description });
  } catch (e) {
    logger.warn({ invoiceId, err: String(e) }, 'handleInvoiceEvent falhou');
  }
}


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

    // Se aprovado, provisionar licença (email será enviado pelo fluxo principal, não aqui)
    if (data.status === 'approved' && payment.status !== 'approved') {
      await licenseService.provisionLicense(
        payment.appId,
        payment.payerEmail!,
        payment.userId ?? undefined,
        {
          customerName: payment.payerName || undefined,
          paymentId: payment.id,
          price: Number(payment.amount),
          sendEmail: false, // Email enviado separadamente
        }
      );

      // NFSe via Asaas (non-blocking) — vinculada à cobrança paga (preferenceId = pay_xxx).
      // Idempotente por cobrança (emitNfseOnce): evita nota dupla mesmo combinando este
      // caminho (ativação manual do admin) com o webhook.
      const app = await prisma.app.findUnique({ where: { id: payment.appId }, select: { name: true } });
      if (Number(payment.amount) > 0 && payment.preferenceId) {
        void emitNfseOnce(
          payment.preferenceId,
          Number(payment.amount),
          `Licença de software - ${app?.name || 'App'}`,
        );
      }
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

    // Resolver userId: se não passou e tem email, cria/vincula guest
    let resolvedUserId = userId;
    if (!resolvedUserId && data?.email) {
      try {
        const { user, isNewGuest } = await userService.findOrCreateGuestUser(
          data.email,
          data.name
        );
        resolvedUserId = user.id;
        logger.info({ userId: user.id, email: maskEmail(data.email), isNewGuest }, 'Usuário resolvido para compra');
      } catch (err) {
        logger.warn({ error: err, email: maskEmail(data?.email) }, 'Falha ao resolver usuário para compra');
      }
    }

    // Nota: Removida verificação de compra duplicada para permitir
    // múltiplas compras (ex: para outras máquinas ou presentes)

    // Quantidade de licenças (1-10)
    const quantity = Math.min(10, Math.max(1, data?.quantity || 1));
    const unitPrice = Number(app.price);
    const totalAmount = unitPrice * quantity;

    // Se app é gratuito, aprovar diretamente
    if (unitPrice === 0) {
      const paymentId = `FREE-${crypto.randomUUID()}`;
      const payment = await paymentRepository.create({
        id: paymentId,
        appId,
        userId: resolvedUserId,
        status: 'approved',
        amount: 0,
        unitPrice: 0,
        quantity,
        installments: 1,
        currency: 'BRL',
        payerEmail: data?.email || undefined,
        payerName: data?.name || undefined,
      });

      // Só provisiona licenças se tiver email (para rastrear)
      let licenseKey: string | undefined;
      if (data?.email) {
        // Provisiona múltiplas licenças conforme quantity (email enviado separadamente)
        for (let i = 0; i < quantity; i++) {
          await licenseService.provisionLicense(appId, data.email, resolvedUserId, {
            customerName: data.name,
            paymentId,
            price: 0,
            sendEmail: false, // Email enviado separadamente abaixo
          });
        }
        // Obter chave de licença para o email
        licenseKey = await licenseService.getLicenseKeyByEmail(appId, data.email) || undefined;

        // Enviar email de confirmação (app gratuito) - ÚNICO email enviado
        sendPurchaseEmail({
          appId,
          appName: app.name,
          appVersion: app.version,
          paymentId,
          payerEmail: data.email,
          payerName: data.name,
          price: 0,
          licenseKey,
        });
      }

      return {
        payment_id: payment.id,
        status: 'approved',
        quantity,
        init_point: null,
        sandbox_init_point: null,
      };
    }

    // Checkout hospedado no Asaas — cliente escolhe PIX ou cartão na página do Asaas.
    // Asaas exige um customer + email pra emitir a cobrança.
    if (!data?.email) {
      throw AppError.badRequest('Email é obrigatório para iniciar o checkout.');
    }
    if (!env.ASAAS_API_KEY) {
      logger.error('Asaas não configurado para criar cobrança (ASAAS_API_KEY ausente)');
      throw AppError.internal('Gateway de pagamento não configurado');
    }

    const paymentId = `PAY-${crypto.randomUUID()}`;

    const customerId = await asaasProvider.findOrCreateCustomer({
      name: data.name,
      email: data.email,
      cpfCnpj: data.identification || undefined, // tomador da NFSe
      phone: data.phone || undefined,
      // Endereço do tomador — exigido pela prefeitura p/ a NFSe.
      postalCode: data.zip || undefined,
      address: data.streetName || undefined,
      addressNumber: data.addressNumber || undefined,
      province: data.neighborhood || undefined,
    });

    const charge = await asaasProvider.createCharge({
      customerId,
      billingType: 'UNDEFINED', // cliente escolhe PIX ou cartão na página hospedada
      value: totalAmount,
      dueDate: defaultDueDate(),
      externalReference: paymentId,
      description: quantity > 1 ? `${app.name} (${quantity} licenças)` : app.name,
      callbackUrl: `${env.FRONTEND_URL}/apps/${appId}/sucesso?payment_id=${paymentId}`,
    });

    logger.info(
      { appId, paymentId, quantity, totalAmount, chargeId: charge.id, hasInvoiceUrl: !!charge.invoiceUrl },
      'Cobrança Asaas (checkout hospedado) criada',
    );

    await paymentRepository.create({
      id: paymentId,
      appId,
      userId: resolvedUserId,
      preferenceId: charge.id, // pay_xxx do Asaas (reusa coluna; renomeada na limpeza)
      status: asaasProvider.mapStatus(charge.status),
      amount: totalAmount,
      unitPrice,
      quantity,
      installments: 1,
      currency: 'BRL',
      payerEmail: data.email,
      payerName: data?.name || undefined,
      mpResponseJson: JSON.stringify({ id: charge.id, status: charge.status, invoiceUrl: charge.invoiceUrl }),
    });

    return {
      payment_id: paymentId,
      preference_id: charge.id,
      status: 'pending',
      quantity,
      total_amount: totalAmount,
      unit_price: unitPrice,
      // Frontend redireciona pra essa URL (página de pagamento hospedada do Asaas).
      init_point: charge.invoiceUrl,
      sandbox_init_point: charge.invoiceUrl,
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

    // Idempotência atômica via lock otimista:
    // Tenta criar o registro de processamento PRIMEIRO. Se o unique constraint
    // falhar (P2002), significa que outro processo já está/já processou — retornamos early.
    // Isso elimina race condition entre findUnique + processamento + upsert.
    const externalId = `${type}:${dataId}`;
    try {
      await prisma.processedWebhook.create({
        data: { externalId, action: type },
      });
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code;
      if (errCode === 'P2002') {
        logger.info({ externalId }, 'Webhook já processado/em processamento — ignorando (idempotência)');
        return { processed: true, reason: 'Webhook duplicado — ignorado', duplicate: true };
      }
      logger.warn({ err, externalId }, 'Falha ao registrar webhook — seguindo adiante');
    }

    // NFSe: eventos de nota fiscal -> alerta quando a nota erra na prefeitura (antes silencioso).
    if (type.startsWith('INVOICE_')) {
      await handleInvoiceEvent(dataId);
      return { processed: true, reason: 'Evento de nota fiscal processado' };
    }

    // Asaas: só eventos de pagamento processam. Aqui type=event, dataId=chargeId.
    if (!type.startsWith('PAYMENT_')) {
      return { processed: false, reason: 'Evento não é de pagamento' };
    }

    // Busca a cobrança no Asaas (não confia no corpo do webhook — fonte da verdade é a API).
    const charge = await asaasProvider.getPayment(dataId);
    if (!charge) {
      logger.warn({ chargeId: dataId }, 'Cobrança não encontrada no Asaas');
      return { processed: false, reason: 'Cobrança não encontrada no Asaas' };
    }

    const externalRef = charge.externalReference;
    const payment = externalRef ? await paymentRepository.findById(externalRef) : null;

    if (!payment) {
      logger.warn({ externalRef, chargeId: dataId }, 'Pagamento não encontrado no banco');
      return { processed: false, reason: 'Pagamento não encontrado' };
    }

    const oldStatus = payment.status;
    const newStatus = asaasProvider.mapStatus(charge.status);

    if (oldStatus === newStatus) {
      return { processed: true, reason: 'Status já atualizado' };
    }

    await paymentRepository.updateStatus(
      payment.id,
      newStatus,
      JSON.stringify({ id: charge.id, status: charge.status }),
    );

    // Provisionar licença se aprovado (com proteção contra duplicação e erro)
    if (newStatus === 'approved' && oldStatus !== 'approved') {
      let licenseKey: string | undefined;
      try {
        // Verificar se licença já existe (idempotência)
        const existingLicense = await licenseService.getLicenseKeyByEmail(payment.appId, payment.payerEmail!);
        if (!existingLicense) {
          await licenseService.provisionLicense(
            payment.appId,
            payment.payerEmail!,
            payment.userId ?? undefined,
            {
              customerName: payment.payerName || undefined,
              paymentId: payment.id,
              price: Number(payment.amount),
              sendEmail: false, // Email enviado separadamente abaixo
            }
          );
          logger.info({ paymentId: payment.id }, 'Licença provisionada via webhook Asaas');
        } else {
          logger.info({ paymentId: payment.id }, 'Licença já existe — não reprovisiona');
        }
        // Obter chave de licença para o email
        licenseKey = await licenseService.getLicenseKeyByEmail(payment.appId, payment.payerEmail!) || undefined;
      } catch (licenseError) {
        logger.error({ error: licenseError, paymentId: payment.id }, 'Erro ao provisionar licença via webhook');
        // Não throw - webhook já processou pagamento com sucesso
      }

      // Enviar email de confirmação (webhook aprovado)
      try {
        const app = await prisma.app.findUnique({
          where: { id: payment.appId },
          select: { name: true, version: true },
        });
        if (app && payment.payerEmail) {
          sendPurchaseEmail({
            appId: payment.appId,
            appName: app.name,
            appVersion: app.version,
            paymentId: payment.id,
            payerEmail: payment.payerEmail,
            payerName: payment.payerName || undefined,
            price: Number(payment.amount),
            licenseKey,
          });
        }

        // NFSe via Asaas (non-blocking) — consolida emissão no painel Asaas.
        // Idempotente por cobrança (emitNfseOnce): só UMA nota por chargeId, mesmo com
        // eventos Asaas distintos (PAYMENT_CONFIRMED depois PAYMENT_RECEIVED) ou 4 réplicas.
        if (Number(payment.amount) > 0) {
          void emitNfseOnce(
            charge.id,
            Number(payment.amount),
            `Licença de software - ${app?.name || 'App'}`,
          );
        }
      } catch (emailError) {
        logger.error({ error: emailError, paymentId: payment.id }, 'Erro ao enviar email via webhook');
      }
    }

    // Registro de processamento já foi criado no início (lock otimista).

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

  /**
   * Reenvia o email de confirmação de compra
   */
  async resendConfirmationEmail(appId: number, email: string) {
    // Buscar pagamento aprovado para esse app e email
    const payments = await paymentRepository.findByAppAndEmail(appId, email);
    const approvedPayment = payments.find(p => p.status === 'approved');

    if (!approvedPayment) {
      throw AppError.notFound('Nenhuma compra aprovada encontrada para este email');
    }

    // Buscar dados do app
    const app = await prisma.app.findUnique({
      where: { id: appId },
      select: { name: true, version: true, executableUrl: true },
    });

    if (!app) {
      throw AppError.notFound('App');
    }

    // Buscar chave de licença
    const licenseKey = await licenseService.getLicenseKeyByEmail(appId, email) || undefined;

    // Construir URL de download
    const baseUrl = env.FRONTEND_URL || 'https://codecraftgenz.com.br';
    const downloadUrl = app.executableUrl
      ? (app.executableUrl.startsWith('http')
          ? app.executableUrl
          : `${baseUrl}/api/downloads/${app.executableUrl.replace(/^\/+/, '')}`)
      : `${baseUrl}/apps/${appId}/sucesso?payment_id=${approvedPayment.id}`;

    // Enviar email
    const sent = await emailService.sendPurchaseConfirmation({
      customerName: approvedPayment.payerName || email.split('@')[0],
      customerEmail: email,
      appName: app.name,
      appVersion: app.version || undefined,
      price: Number(approvedPayment.amount),
      paymentId: approvedPayment.id,
      downloadUrl,
      licenseKey,
      purchaseDate: approvedPayment.createdAt,
    });

    if (!sent) {
      throw AppError.internal('Falha ao enviar email. Verifique as configurações de email.');
    }

    logger.info({ paymentId: approvedPayment.id, email: maskEmail(email) }, 'Email de confirmação reenviado');

    return {
      sent: true,
      payment_id: approvedPayment.id,
      email,
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
    const payerName = `${data.payer.first_name || ''} ${data.payer.last_name || ''}`.trim() || undefined;

    // Resolver userId: se não passou, cria/vincula guest pelo email
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      try {
        const { user, isNewGuest } = await userService.findOrCreateGuestUser(
          payerEmail,
          payerName
        );
        resolvedUserId = user.id;
        logger.info({ userId: user.id, email: maskEmail(payerEmail), isNewGuest }, 'Usuário resolvido para pagamento direto');
      } catch (err) {
        logger.warn({ error: err, email: maskEmail(payerEmail) }, 'Falha ao resolver usuário para pagamento direto');
      }
    }

    // Nota: Removida verificação de compra duplicada para permitir
    // múltiplas compras (ex: para outras máquinas ou presentes)

    // Quantidade de licenças (1-10) e parcelas (1-4)
    const quantity = Math.min(10, Math.max(1, data.quantity || 1));
    const installments = Math.min(4, Math.max(1, data.installments || 1));
    const unitPrice = Number(app.price || 0);
    const totalAmount = unitPrice * quantity;

    // Se app é gratuito, aprovar diretamente
    if (unitPrice === 0) {
      const paymentId = `FREE-${crypto.randomUUID()}`;
      await paymentRepository.create({
        id: paymentId,
        appId,
        userId: resolvedUserId,
        status: 'approved',
        amount: 0,
        unitPrice: 0,
        quantity,
        installments: 1,
        currency: 'BRL',
        payerEmail,
        payerName,
      });

      // Provisiona múltiplas licenças conforme quantity
      for (let i = 0; i < quantity; i++) {
        await licenseService.provisionLicense(appId, payerEmail, resolvedUserId, {
          customerName: payerName,
          paymentId,
          price: 0,
        });
      }

      return {
        success: true,
        payment_id: paymentId,
        status: 'approved',
        quantity,
        license_key: await licenseService.getLicenseKeyByEmail(appId, payerEmail),
      };
    }

    // Asaas: PIX gera QR inline; cartão vai pro checkout hospedado (redirect).
    // Cobrança one-shot começa 'pending'; provisionamento de licença/email/NFSe
    // acontece no webhook PAYMENT_CONFIRMED/RECEIVED (não há aprovação síncrona).
    if (!env.ASAAS_API_KEY) {
      throw AppError.internal('Gateway de pagamento não configurado');
    }
    void options; // idempotencyKey/deviceId/trackingId eram do MP — não usados no Asaas

    const paymentId = `DIRECT-${crypto.randomUUID()}`;
    const isPix = data.payment_method_id === 'pix';
    const cpfCnpj = data.payer.identification?.number;

    const customerId = await asaasProvider.findOrCreateCustomer({
      name: payerName,
      email: payerEmail,
      cpfCnpj,
      // Endereço do tomador (PIX/cartão direto) — exigido pela prefeitura p/ a NFSe.
      postalCode: data.payer.address?.zip_code || undefined,
      address: data.payer.address?.street_name || undefined,
      addressNumber: data.payer.address?.number || undefined,
      province: data.payer.address?.neighborhood || undefined,
    });

    let charge;
    try {
      charge = await asaasProvider.createCharge({
        customerId,
        billingType: isPix ? 'PIX' : 'CREDIT_CARD',
        value: totalAmount,
        dueDate: defaultDueDate(),
        externalReference: paymentId,
        description: data.description || `${app.name}${quantity > 1 ? ` (${quantity} licenças)` : ''}`,
        // Cartão (checkout hospedado) volta pro site após pagar; PIX é QR inline.
        callbackUrl: isPix ? undefined : `${env.FRONTEND_URL}/apps/${appId}/sucesso?payment_id=${paymentId}`,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ error }, 'Erro ao criar cobrança Asaas (pagamento direto)');
      throw AppError.internal('Falha ao processar pagamento');
    }

    const internalStatus = asaasProvider.mapStatus(charge.status);

    // PIX: busca QR (copia-e-cola + imagem base64)
    let pix: { qr_code?: string; qr_code_base64?: string } | undefined;
    if (isPix) {
      const qr = await asaasProvider.getPixQrCode(charge.id);
      if (qr) pix = { qr_code: qr.payload, qr_code_base64: qr.encodedImage };
    }

    await paymentRepository.create({
      id: paymentId,
      appId,
      userId: resolvedUserId,
      preferenceId: charge.id,
      status: internalStatus,
      amount: totalAmount,
      unitPrice,
      quantity,
      installments,
      currency: 'BRL',
      payerEmail,
      payerName,
      mpResponseJson: JSON.stringify({ id: charge.id, status: charge.status, invoiceUrl: charge.invoiceUrl }),
    });

    logger.info({ paymentId, appId, email: maskEmail(payerEmail), isPix }, 'Cobrança Asaas (direta) criada');

    // Retorno (whitelist): PIX → QR inline; cartão → URL hospedada pra redirect.
    return {
      success: true,
      payment_id: paymentId,
      mp_payment_id: charge.id,
      status: internalStatus === 'approved' ? 'approved' : 'pending',
      quantity,
      installments,
      total_amount: totalAmount,
      unit_price: unitPrice,
      ...(isPix
        ? { qr_code: pix?.qr_code, qr_code_base64: pix?.qr_code_base64 }
        : { init_point: charge.invoiceUrl, redirect_url: charge.invoiceUrl }),
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

/**
 * Envia email de confirmação de compra
 * Não lança erro se falhar - apenas loga
 */
async function sendPurchaseEmail(options: {
  appId: number;
  appName: string;
  appVersion?: string;
  paymentId: string;
  payerEmail: string;
  payerName?: string;
  price: number;
  licenseKey?: string;
}) {
  logger.info({
    paymentId: options.paymentId,
    email: options.payerEmail,
    appName: options.appName,
  }, '[EMAIL] Iniciando envio de email de confirmação de compra');

  try {
    // Buscar URL de download do app
    const app = await prisma.app.findUnique({
      where: { id: options.appId },
      select: { executableUrl: true, version: true },
    });

    // Construir URL de download
    const baseUrl = env.FRONTEND_URL || 'https://codecraftgenz.com.br';
    const downloadUrl = app?.executableUrl
      ? (app.executableUrl.startsWith('http')
          ? app.executableUrl
          : `${baseUrl}/api/downloads/${app.executableUrl.replace(/^\/+/, '')}`)
      : `${baseUrl}/apps/${options.appId}/sucesso?payment_id=${options.paymentId}`;

    logger.info({
      paymentId: options.paymentId,
      downloadUrl,
      hasExecutableUrl: !!app?.executableUrl,
    }, '[EMAIL] URL de download construída');

    const emailSent = await emailService.sendPurchaseConfirmation({
      customerName: options.payerName || options.payerEmail.split('@')[0],
      customerEmail: options.payerEmail,
      appName: options.appName,
      appVersion: options.appVersion || app?.version || undefined,
      price: options.price,
      paymentId: options.paymentId,
      downloadUrl,
      licenseKey: options.licenseKey,
      purchaseDate: new Date(),
    });

    if (emailSent) {
      logger.info({ paymentId: options.paymentId, email: maskEmail(options.payerEmail) }, '[EMAIL] Email de confirmação ENVIADO com sucesso');
    } else {
      logger.error({ paymentId: options.paymentId, email: maskEmail(options.payerEmail) }, '[EMAIL] Email de confirmação NÃO FOI ENVIADO - verifique as credenciais EMAIL_USER e EMAIL_PASS');
    }
  } catch (error) {
    logger.error({ error, paymentId: options.paymentId, email: maskEmail(options.payerEmail) }, '[EMAIL] ERRO ao enviar email de confirmação');
    // Não propaga erro - email é secundário
  }
}
