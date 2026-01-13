import { prisma } from '../db/prisma.js';
import crypto from 'crypto';

export const licenseRepository = {
  async findByAppAndEmail(appId: number, email: string) {
    return prisma.license.findMany({
      where: { appId, email },
      include: {
        app: {
          select: { id: true, name: true },
        },
        activations: {
          orderBy: { activatedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByAppEmailAndHardware(appId: number, email: string, hardwareId: string) {
    return prisma.license.findFirst({
      where: {
        appId,
        email,
        hardwareId,
      },
    });
  },

  async findAvailableSlot(appId: number, email: string) {
    return prisma.license.findFirst({
      where: {
        appId,
        email,
        OR: [
          { hardwareId: null },
          { hardwareId: '' },
        ],
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.license.findMany({
      where: { email },
      include: {
        app: {
          select: { id: true, name: true, thumbUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: {
    appId: number;
    email: string;
    userId?: number;
    hardwareId?: string;
    licenseKey?: string;
    appName?: string;
  }) {
    const licenseKey = data.licenseKey || generateLicenseKey();

    return prisma.license.create({
      data: {
        appId: data.appId,
        email: data.email,
        userId: data.userId,
        hardwareId: data.hardwareId,
        licenseKey,
        appName: data.appName,
        activatedAt: data.hardwareId ? new Date() : null,
      },
    });
  },

  async activateDevice(licenseId: number, hardwareId: string) {
    return prisma.license.update({
      where: { id: licenseId },
      data: {
        hardwareId,
        activatedAt: new Date(),
      },
    });
  },

  async releaseDevice(licenseId: number) {
    return prisma.license.update({
      where: { id: licenseId },
      data: {
        hardwareId: null,
        activatedAt: null,
      },
    });
  },

  async countUsedLicenses(appId: number, email: string) {
    return prisma.license.count({
      where: {
        appId,
        email,
        hardwareId: { not: null },
        NOT: { hardwareId: '' },
      },
    });
  },

  async logActivation(data: {
    appId: number;
    email?: string;
    hardwareId?: string;
    licenseId?: number;
    action: string;
    status: string;
    message?: string;
    ip?: string;
    userAgent?: string;
  }) {
    return prisma.licenseActivation.create({
      data: {
        appId: data.appId,
        email: data.email,
        hardwareId: data.hardwareId,
        licenseId: data.licenseId,
        action: data.action,
        status: data.status,
        message: data.message,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  },

  async exists(id: number) {
    const count = await prisma.license.count({ where: { id } });
    return count > 0;
  },
};

function generateLicenseKey(): string {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(3).toString('hex').toUpperCase());
  }
  return segments.join('-');
}
