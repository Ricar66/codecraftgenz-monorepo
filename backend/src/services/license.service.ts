import { licenseRepository } from '../repositories/license.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../db/prisma.js';
import type { ActivateDeviceInput, VerifyLicenseInput } from '../schemas/license.schema.js';

const MAX_DEVICES_PER_LICENSE = 3;

export const licenseService = {
  async activateDevice(data: ActivateDeviceInput, ip?: string, userAgent?: string) {
    const appId = Number(data.app_id);
    const { email, hardware_id } = data;

    // Buscar app
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      await licenseRepository.logActivation({
        appId,
        email,
        hardwareId: hardware_id,
        action: 'activate',
        status: 'error',
        message: 'App não encontrado',
        ip,
        userAgent,
      });
      throw AppError.notFound('App');
    }

    // Verificar se já tem licença ativa para este dispositivo
    const existingActivation = await licenseRepository.findByAppEmailAndHardware(
      appId,
      email,
      hardware_id
    );

    if (existingActivation) {
      await licenseRepository.logActivation({
        appId,
        email,
        hardwareId: hardware_id,
        licenseId: existingActivation.id,
        action: 'activate',
        status: 'success',
        message: 'Dispositivo já ativado',
        ip,
        userAgent,
      });

      return {
        success: true,
        message: 'Dispositivo já ativado',
        license_key: existingActivation.licenseKey,
        app_name: app.name,
      };
    }

    // Verificar se tem compra aprovada
    const approvedCount = await paymentRepository.countApprovedByEmailAndApp(email, appId);
    if (approvedCount === 0) {
      await licenseRepository.logActivation({
        appId,
        email,
        hardwareId: hardware_id,
        action: 'activate',
        status: 'error',
        message: 'Nenhuma compra aprovada encontrada',
        ip,
        userAgent,
      });
      throw AppError.forbidden('Você não possui licença para este app');
    }

    // Contar dispositivos já ativados
    const usedLicenses = await licenseRepository.countUsedLicenses(appId, email);
    if (usedLicenses >= approvedCount * MAX_DEVICES_PER_LICENSE) {
      await licenseRepository.logActivation({
        appId,
        email,
        hardwareId: hardware_id,
        action: 'activate',
        status: 'error',
        message: `Limite de ${MAX_DEVICES_PER_LICENSE} dispositivos atingido`,
        ip,
        userAgent,
      });
      throw AppError.forbidden(`Limite de ${MAX_DEVICES_PER_LICENSE} dispositivos por licença atingido`);
    }

    // Buscar slot disponível ou criar nova licença
    let license = await licenseRepository.findAvailableSlot(appId, email);

    if (license) {
      // Ativar dispositivo no slot existente
      license = await licenseRepository.activateDevice(license.id, hardware_id);
    } else {
      // Criar nova licença com o dispositivo
      license = await licenseRepository.create({
        appId,
        email,
        hardwareId: hardware_id,
        appName: app.name,
      });
    }

    await licenseRepository.logActivation({
      appId,
      email,
      hardwareId: hardware_id,
      licenseId: license.id,
      action: 'activate',
      status: 'success',
      message: 'Dispositivo ativado com sucesso',
      ip,
      userAgent,
    });

    logger.info({ appId, email, hardwareId: hardware_id }, 'Dispositivo ativado');

    return {
      success: true,
      message: 'Dispositivo ativado com sucesso',
      license_key: license.licenseKey,
      app_name: app.name,
    };
  },

  async verifyLicense(data: VerifyLicenseInput, ip?: string, userAgent?: string) {
    const appId = Number(data.app_id);
    const { email, hardware_id } = data;

    // Verificar se tem licença ativa para este dispositivo
    const license = await licenseRepository.findByAppEmailAndHardware(
      appId,
      email,
      hardware_id
    );

    if (!license) {
      await licenseRepository.logActivation({
        appId,
        email,
        hardwareId: hardware_id,
        action: 'verify',
        status: 'error',
        message: 'Licença não encontrada',
        ip,
        userAgent,
      });

      return {
        valid: false,
        message: 'Licença não encontrada para este dispositivo',
      };
    }

    await licenseRepository.logActivation({
      appId,
      email,
      hardwareId: hardware_id,
      licenseId: license.id,
      action: 'verify',
      status: 'success',
      message: 'Licença válida',
      ip,
      userAgent,
    });

    return {
      valid: true,
      message: 'Licença válida',
      license_key: license.licenseKey,
      activated_at: license.activatedAt,
    };
  },

  async provisionLicense(appId: number, email: string, userId?: number) {
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      logger.error({ appId }, 'App não encontrado ao provisionar licença');
      throw AppError.notFound('App');
    }

    // Verificar se já tem licença
    const existing = await licenseRepository.findByAppAndEmail(appId, email);
    if (existing.length > 0) {
      logger.info({ appId, email }, 'Licença já existe, não criando nova');
      return existing[0];
    }

    // Criar licença (sem hardware_id, será ativado depois)
    const license = await licenseRepository.create({
      appId,
      email,
      userId,
      appName: app.name,
    });

    logger.info({ appId, email, licenseId: license.id }, 'Licença provisionada');

    return license;
  },

  async claimByEmail(email: string) {
    const licenses = await licenseRepository.findByEmail(email);

    return licenses.map((license) => ({
      id: license.id,
      app_id: license.appId,
      app_name: license.appName || license.app?.name,
      app_thumb: license.app?.thumbUrl,
      license_key: license.licenseKey,
      hardware_id: license.hardwareId,
      activated_at: license.activatedAt,
      created_at: license.createdAt,
    }));
  },

  async getPurchasesByEmail(email: string, appId?: number) {
    const where: Record<string, unknown> = {
      payerEmail: email,
      status: 'approved',
    };
    if (appId) where.appId = appId;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        app: {
          select: { id: true, name: true, thumbUrl: true, executableUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      payment_id: p.id,
      app_id: p.appId,
      app_name: p.app?.name,
      app_thumb: p.app?.thumbUrl,
      executable_url: p.app?.executableUrl,
      amount: Number(p.amount),
      purchased_at: p.createdAt,
    }));
  },

  async getDownloadUrl(appId: number, email: string) {
    // Verificar se tem compra aprovada
    const approvedCount = await paymentRepository.countApprovedByEmailAndApp(email, appId);
    if (approvedCount === 0) {
      throw AppError.forbidden('Você não possui licença para este app');
    }

    const app = await prisma.app.findUnique({
      where: { id: appId },
      select: { executableUrl: true, name: true },
    });

    if (!app || !app.executableUrl) {
      throw AppError.notFound('Download não disponível para este app');
    }

    // Incrementar contador de downloads
    await prisma.app.update({
      where: { id: appId },
      data: { downloadCount: { increment: 1 } },
    });

    return {
      download_url: app.executableUrl,
      app_name: app.name,
    };
  },
};
