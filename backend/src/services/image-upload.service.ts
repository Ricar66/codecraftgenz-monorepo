// src/services/image-upload.service.ts
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import fs from 'fs/promises';
import path from 'path';

const IMAGES_SUBDIR = 'images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
];

export const imageUploadService = {
  /**
   * Extrai o nome do arquivo de uma URL de imagem da Hostinger
   * Ex: "https://codecraftgenz.com.br/downloads/images/1234-foto.png" -> "images/1234-foto.png"
   */
  extractImagePath(url: string): string | null {
    if (!url) return null;
    const match = url.match(/\/downloads\/(images\/[^?#]+)/);
    return match ? match[1] : null;
  },

  /**
   * Deleta uma imagem antiga da Hostinger e do disco local
   */
  async deleteOldImage(oldUrl: string): Promise<void> {
    const imagePath = this.extractImagePath(oldUrl);
    if (!imagePath) return;

    const fileName = imagePath.split('/').pop();
    if (!fileName) return;

    // Deletar do disco local
    try {
      const downloadsDir = env.DOWNLOADS_DIR || path.join(process.cwd(), 'public', 'downloads');
      const localPath = path.join(downloadsDir, IMAGES_SUBDIR, fileName);
      await fs.unlink(localPath);
      logger.info({ fileName }, 'Imagem antiga deletada do disco local');
    } catch {
      // Arquivo pode não existir localmente
    }

    // Deletar da Hostinger via FTP
    try {
      const { isFtpConfigured, deleteFromHostinger } = await import('./ftp.service.js');
      if (isFtpConfigured()) {
        await deleteFromHostinger(`${IMAGES_SUBDIR}/${fileName}`);
        logger.info({ fileName }, 'Imagem antiga deletada da Hostinger via FTP');
      }
    } catch (ftpError) {
      logger.warn({ error: ftpError, fileName }, 'Erro ao deletar imagem antiga via FTP (ignorando)');
    }
  },

  async uploadImage(file: { originalname: string; buffer: Buffer; size: number; mimetype: string }, oldUrl?: string) {
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

    // Salvar localmente em downloads/images/
    const downloadsDir = env.DOWNLOADS_DIR || path.join(process.cwd(), 'public', 'downloads');
    const imagesDir = path.join(downloadsDir, IMAGES_SUBDIR);
    await fs.mkdir(imagesDir, { recursive: true });

    const filePath = path.join(imagesDir, fileName);
    await fs.writeFile(filePath, file.buffer);
    logger.info({ fileName, size: file.size, path: filePath }, 'Imagem salva no disco local');

    // URL fallback via API do backend
    let publicUrl = `/api/downloads/${IMAGES_SUBDIR}/${encodeURIComponent(fileName)}`;

    // Upload para Hostinger via FTP (em /public_html/downloads/images/)
    try {
      const { isFtpConfigured, uploadToHostinger } = await import('./ftp.service.js');
      if (isFtpConfigured()) {
        const ftpUrl = await uploadToHostinger(`${IMAGES_SUBDIR}/${fileName}`, file.buffer);
        publicUrl = ftpUrl;
        logger.info({ fileName, url: ftpUrl }, 'Imagem enviada para Hostinger via FTP');
      }
    } catch (ftpError) {
      logger.warn({ error: ftpError, fileName }, 'Erro no upload FTP de imagem (usando URL local)');
    }

    return {
      file_name: fileName,
      file_size: file.size,
      url: publicUrl,
    };
  },
};
