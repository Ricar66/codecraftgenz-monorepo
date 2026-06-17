// src/services/asaas.service.ts
// Cliente do gateway Asaas — substitui o Mercado Pago no ecossistema Craft.
// Mesma conta/CNPJ do CardCraft. Modelo do CodeCraft é compra AVULSA de licença
// (one-shot, sem assinatura), então usamos cobranças únicas (POST /v3/payments).

import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

const BASE_URL = env.ASAAS_API_URL;
const API_KEY = env.ASAAS_API_KEY;

export type AsaasBillingType = 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';

export interface AsaasCharge {
  id: string; // pay_xxx
  status: string; // PENDING | RECEIVED | CONFIRMED | OVERDUE | REFUNDED | ...
  value: number;
  billingType: string;
  invoiceUrl?: string; // página hospedada onde o cliente paga (cartão/escolha)
  dueDate?: string;
  externalReference?: string | null;
  customer?: string;
}

export interface AsaasPixQr {
  encodedImage: string; // base64 do QR Code
  payload: string; // copia-e-cola
  expirationDate?: string;
}

export interface AsaasInvoiceResponse {
  id: string;
  status: string; // scheduled | synchronized | authorized | canceled | error
  number?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  value?: number;
  payment?: string;
}

/**
 * Helper HTTP genérico pra API Asaas. Auth via header `access_token`.
 * Lança AppError em respostas não-2xx (mensagem extraída do corpo Asaas).
 */
async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  if (!API_KEY) {
    throw AppError.internal('Asaas não configurado (ASAAS_API_KEY ausente)');
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      access_token: API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'CodeCraft',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const errMsg =
      (data as { errors?: Array<{ description?: string }> })?.errors?.[0]?.description ||
      (data as { message?: string })?.message ||
      `Asaas ${method} ${path} HTTP ${res.status}`;
    logger.warn({ status: res.status, path, errMsg }, 'Asaas API erro');
    throw AppError.badRequest(errMsg);
  }

  return data as T;
}

export const asaasProvider = {
  /**
   * Acha (por CPF/CNPJ ou email) ou cria um customer no Asaas. Toda cobrança
   * precisa de um customer. Retorna o id (cus_xxx).
   */
  async findOrCreateCustomer(input: {
    name?: string;
    email?: string;
    cpfCnpj?: string;
    phone?: string;
  }): Promise<string> {
    // Tenta achar por cpfCnpj (mais confiável) ou email.
    const query = input.cpfCnpj
      ? `cpfCnpj=${encodeURIComponent(input.cpfCnpj)}`
      : input.email
        ? `email=${encodeURIComponent(input.email)}`
        : '';
    if (query) {
      const found = await request<{ data?: Array<{ id: string }> }>(
        'GET',
        `/customers?${query}&limit=1`,
      ).catch(() => null);
      if (found?.data?.[0]?.id) return found.data[0].id;
    }

    const created = await request<{ id: string }>('POST', '/customers', {
      name: input.name || input.email || 'Cliente CodeCraft',
      email: input.email,
      cpfCnpj: input.cpfCnpj,
      mobilePhone: input.phone,
    });
    return created.id;
  },

  /**
   * Cria uma cobrança única. billingType:
   *  - PIX → gera QR via getPixQrCode
   *  - CREDIT_CARD/UNDEFINED → cliente paga na invoiceUrl (checkout hospedado)
   */
  async createCharge(input: {
    customerId: string;
    billingType: AsaasBillingType;
    value: number;
    dueDate: string; // yyyy-MM-dd
    externalReference: string; // nosso paymentId interno
    description?: string;
    callbackUrl?: string; // pra onde o cliente volta após pagar no checkout hospedado
  }): Promise<AsaasCharge> {
    const charge = await request<AsaasCharge>('POST', '/payments', {
      customer: input.customerId,
      billingType: input.billingType,
      value: input.value,
      dueDate: input.dueDate,
      externalReference: input.externalReference,
      description: input.description,
      // Retorna o cliente ao site após o pagamento (cartão/checkout hospedado).
      ...(input.callbackUrl
        ? { callback: { successUrl: input.callbackUrl, autoRedirect: true } }
        : {}),
    });
    logger.info(
      { chargeId: charge.id, billingType: input.billingType, ref: input.externalReference },
      'Asaas cobrança criada',
    );
    return charge;
  },

  /** QR Code PIX (copia-e-cola + imagem) de uma cobrança PIX. */
  async getPixQrCode(chargeId: string): Promise<AsaasPixQr | null> {
    try {
      return await request<AsaasPixQr>('GET', `/payments/${chargeId}/pixQrCode`);
    } catch (e) {
      logger.warn({ chargeId, err: String(e) }, 'Falha ao obter QR PIX Asaas');
      return null;
    }
  },

  async getPayment(chargeId: string): Promise<AsaasCharge | null> {
    try {
      return await request<AsaasCharge>('GET', `/payments/${chargeId}`);
    } catch {
      return null;
    }
  },

  /** Estorna uma cobrança paga (refund total). */
  async refundPayment(chargeId: string): Promise<{ id: string; status: string } | null> {
    try {
      return await request<{ id: string; status: string }>(
        'POST',
        `/payments/${chargeId}/refund`,
        {},
      );
    } catch (e) {
      logger.error({ chargeId, err: String(e) }, 'Refund Asaas falhou');
      return null;
    }
  },

  /**
   * Valida o webhook Asaas. O painel envia o token configurado no header
   * `asaas-access-token`. Comparação timing-safe (CWE-345).
   */
  verifyWebhookToken(receivedToken: string | undefined): boolean {
    const expected = env.ASAAS_WEBHOOK_TOKEN;
    if (!expected || !receivedToken) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(receivedToken);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  },

  // ── NFSe via Asaas (Fase 4 — consolida a emissão no painel Asaas) ──────────
  /**
   * Agenda emissão de NFSe vinculada a uma cobrança paga (item LC 01.05).
   * effectiveDate = hoje → emite em até 15min. Simples Nacional: sem retenção.
   */
  async scheduleInvoice(input: {
    chargeId: string; // pay_xxx
    value: number;
    serviceDescription: string;
  }): Promise<AsaasInvoiceResponse | null> {
    if (env.ASAAS_NFSE_DISABLED === '1') return null;
    const today = new Date().toISOString().split('T')[0];
    try {
      const result = await request<AsaasInvoiceResponse>('POST', '/invoices', {
        payment: input.chargeId,
        serviceDescription: input.serviceDescription,
        observations: env.ASAAS_NFSE_OBSERVATIONS,
        value: input.value,
        deductions: 0,
        effectiveDate: today,
        municipalServiceCode: env.ASAAS_NFSE_SERVICE_CODE,
        municipalServiceName: env.ASAAS_NFSE_SERVICE_NAME,
        taxes: {
          retainIss: false,
          iss: env.ASAAS_NFSE_ISS_RATE,
          pis: 0,
          cofins: 0,
          csll: 0,
          inss: 0,
          ir: 0,
        },
      });
      logger.info({ invoiceId: result.id, chargeId: input.chargeId }, 'NFSe Asaas agendada');
      return result;
    } catch (e) {
      logger.error({ chargeId: input.chargeId, err: String(e) }, 'NFSe Asaas scheduleInvoice falhou');
      return null;
    }
  },

  async cancelInvoice(invoiceId: string): Promise<{ id: string; status: string } | null> {
    try {
      return await request<{ id: string; status: string }>(
        'POST',
        `/invoices/${invoiceId}/cancel`,
        { cancelOnlyOnAsaas: false },
      );
    } catch (e) {
      logger.error({ invoiceId, err: String(e) }, 'cancelInvoice Asaas falhou');
      return null;
    }
  },

  /** Mapeia status Asaas → status interno do CodeCraft (mesmos do MP). */
  mapStatus(asaasStatus: string): string {
    const map: Record<string, string> = {
      PENDING: 'pending',
      AWAITING_RISK_ANALYSIS: 'pending',
      CONFIRMED: 'approved',
      RECEIVED: 'approved',
      RECEIVED_IN_CASH: 'approved',
      OVERDUE: 'pending',
      REFUNDED: 'refunded',
      REFUND_REQUESTED: 'refunded',
      CHARGEBACK_REQUESTED: 'refunded',
      CHARGEBACK_DISPUTE: 'refunded',
      DELETED: 'cancelled',
      CANCELED: 'cancelled',
    };
    return map[asaasStatus] || 'pending';
  },
};
