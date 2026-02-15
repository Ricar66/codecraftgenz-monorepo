import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

export const hubService = {
  async getAppsWithLicenseStatus(userId: number, userEmail: string) {
    // Buscar todos os apps publicados/disponíveis
    const apps = await prisma.app.findMany({
      where: {
        status: { in: ['published', 'available'] },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });

    // Buscar todas as licenças do usuário
    const licenses = await prisma.license.findMany({
      where: { email: userEmail },
      select: {
        appId: true,
        licenseKey: true,
        hardwareId: true,
      },
    });

    // Montar map appId -> licença
    const licenseMap = new Map<number, { licenseKey: string | null; hardwareId: string | null }>();
    for (const lic of licenses) {
      // Se já tem uma licença para esse app, preferir a que tem hardware ativado
      const existing = licenseMap.get(lic.appId);
      if (!existing || (lic.hardwareId && !existing.hardwareId)) {
        licenseMap.set(lic.appId, {
          licenseKey: lic.licenseKey,
          hardwareId: lic.hardwareId,
        });
      }
    }

    logger.info(
      { userId, email: userEmail, totalApps: apps.length, ownedApps: licenseMap.size },
      'Hub: apps com status de licença carregados'
    );

    return apps.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      short_description: app.shortDescription,
      price: Number(app.price),
      category: app.category,
      tags: parseJson(app.tags, []),
      thumb_url: app.thumbUrl,
      screenshots: parseJson(app.screenshots, []),
      executable_url: app.executableUrl,
      platforms: parseJson(app.platforms, ['windows']),
      version: app.version,
      featured: app.featured,
      download_count: app.downloadCount,
      owned: licenseMap.has(app.id),
      license_key: licenseMap.get(app.id)?.licenseKey ?? null,
    }));
  },
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
