import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Resolve URLs relativas de imagem para absolutas (para clientes externos como o Hub desktop).
 * Ex: "/api/downloads/images/apps/123-foto.png" -> "https://codecraftgenz-monorepo.onrender.com/api/downloads/images/apps/123-foto.png"
 */
function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  // Ja e absoluta
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  // Relativa -> absoluta usando a URL do backend
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 8080}`;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const hubService = {
  async getAppsWithLicenseStatus(userId: number, userEmail: string, userRole?: string) {
    // Buscar todos os apps publicados/disponíveis (exclui o próprio Hub)
    const apps = await prisma.app.findMany({
      where: {
        status: { in: ['published', 'available'] },
        name: { not: 'CodeCraft Hub' },
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
      thumb_url: resolveImageUrl(app.thumbUrl),
      screenshots: parseJson(app.screenshots, []).map((s: string) => resolveImageUrl(s) || s),
      executable_url: app.executableUrl,
      platforms: parseJson(app.platforms, ['windows']),
      version: app.version,
      featured: app.featured,
      download_count: app.downloadCount,
      owned: userRole === 'admin' || licenseMap.has(app.id),
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
