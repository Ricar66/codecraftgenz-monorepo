// src/routes/uploads.ts
import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { imageUploadService } from '../services/image-upload.service.js';
import { success, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de imagem não permitido. Use JPEG, PNG, WEBP, GIF ou SVG.'));
    }
  },
});

// POST /api/uploads/image
router.post(
  '/image',
  authenticate,
  authorizeAdmin,
  imageUpload.single('file'),
  async (req: Request, res: Response) => {
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      sendError(res, 400, 'NO_FILE', 'Nenhuma imagem enviada');
      return;
    }

    try {
      // old_url vem como campo do form (multipart) para substituir imagem anterior
      const oldUrl = req.body?.old_url as string | undefined;
      // category: 'apps' ou 'projetos' (default: 'apps')
      const category = (req.body?.category as string) || 'apps';
      const result = await imageUploadService.uploadImage(file, oldUrl, category as 'apps' | 'projetos');
      res.json(success(result));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao processar upload';
      logger.error({ error }, 'Erro no upload de imagem');
      sendError(res, 400, 'IMAGE_UPLOAD_ERROR', msg);
    }
  }
);

export default router;
