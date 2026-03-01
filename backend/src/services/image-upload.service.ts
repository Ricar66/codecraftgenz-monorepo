// src/services/image-upload.service.ts
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import fs from 'fs/promises';
import path from 'path';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
];
const VALID_CATEGORIES = ['apps', 'projetos'] as const;
type ImageCategory = typeof VALID_CATEGORIES[number];

export const imageUploadService = {
  /**
   * Extrai o caminho relativo da imagem a partir da URL
   * Ex: "https://codecraftgenz.com.br/downloads/images/apps/1234-foto.png" -> "images/apps/1234-foto.png"
   */
  extractImagePath(url: string): string | null {
    if (!url) return null;
    const match = url.match(/\/downloads\/(images\/(?:apps|projetos)\/[^?#]+)/);
    return match ? match[1] : null;
  },

  /**
   * Deleta uma imagem antiga da Hostinger e do disco local
   */
  async deleteOldImage(oldUrl: string): Promise<void> {
    const imagePath = this.extractImagePath(oldUrl);
    if (!imagePath) return;

    // imagePath = "images/apps/1234-foto.png" ou "images/projetos/1234-foto.png"

    // Deletar do disco local
    try {
      const downloadsDir = env.DOWNLOADS_DIR || path.join(process.cwd(), 'public', 'downloads');
      const localPath = path.join(downloadsDir, ...imagePath.split('/'));
      await fs.unlink(localPath);
      logger.info({ imagePath }, 'Imagem antiga deletada do disco local');
    } catch {
      // Arquivo pode não existir localmente
    }

    // Deletar da Hostinger via FTP
    try {
      const { isFtpConfigured, deleteFromHostinger } = await import('./ftp.service.js');
      if (isFtpConfigured()) {
        await deleteFromHostinger(imagePath);
        logger.info({ imagePath }, 'Imagem antiga deletada da Hostinger via FTP');
      }
    } catch (ftpError) {
      logger.warn({ error: ftpError, imagePath }, 'Erro ao deletar imagem antiga via FTP (ignorando)');
    }
  },

  async uploadImage(
    file: { originalname: string; buffer: Buffer; size: number; mimetype: string },
    oldUrl?: string,
    category: ImageCategory = 'apps'
  ) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Categoria inválida: ${category}. Use: ${VALID_CATEGORIES.join(', ')}`);
    }

    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new Error('Tipo de imagem não permitido. Use JPEG, PNG, WEBP, GIF ou SVG.');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('Imagem muito grande. Máximo de 5MB.');
    }

    // Deletar imagem antiga se fornecida
    if (oldUrl) {
      await this.deleteOldImage(oldUrl);
    }

    // Sanitizar filename com prefixo timestamp
    const timestamp = Date.now();
    const sanitized = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/__+/g, '_');
    const fileName = `${timestamp}-${sanitized}`;

    // Subdir: images/apps ou images/projetos
    const imagesSubdir = `images/${category}`;

    // Salvar localmente em downloads/images/<category>/
    const downloadsDir = env.DOWNLOADS_DIR || path.join(process.cwd(), 'public', 'downloads');
    const imagesDir = path.join(downloadsDir, 'images', category);
    await fs.mkdir(imagesDir, { recursive: true });

    const filePath = path.join(imagesDir, fileName);
    await fs.writeFile(filePath, file.buffer);
    logger.info({ fileName, category, size: file.size, path: filePath }, 'Imagem salva no disco local');

    // URL fallback via API do backend
    let publicUrl = `/api/downloads/${imagesSubdir}/${encodeURIComponent(fileName)}`;

    // Upload para Hostinger via FTP (em /public_html/downloads/images/<category>/)
    try {
      const { isFtpConfigured, uploadToHostinger } = await import('./ftp.service.js');
      if (isFtpConfigured()) {
        const ftpUrl = await uploadToHostinger(`${imagesSubdir}/${fileName}`, file.buffer);
        publicUrl = ftpUrl;
        logger.info({ fileName, category, url: ftpUrl }, 'Imagem enviada para Hostinger via FTP');
      }
    } catch (ftpError) {
      logger.warn({ error: ftpError, fileName, category }, 'Erro no upload FTP de imagem (usando URL local)');
    }

    return {
      file_name: fileName,
      file_size: file.size,
      url: publicUrl,
    };
  },
};
