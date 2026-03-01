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
  async uploadImage(file: { originalname: string; buffer: Buffer; size: number; mimetype: string }) {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new Error('Tipo de imagem não permitido. Use JPEG, PNG, WEBP, GIF ou SVG.');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('Imagem muito grande. Máximo de 5MB.');
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
