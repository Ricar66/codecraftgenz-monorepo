import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { sendError, success } from '../utils/response.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { env } from '../config/env.js';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const router = Router();

// Diretório de downloads (configurável via env ou default)
const DOWNLOADS_DIR = env.DOWNLOADS_DIR || path.join(process.cwd(), 'downloads');

/**
 * GET /api/downloads/:file
 * Servir arquivo de download
 */
router.get('/:file', rateLimiter.default, async (req, res): Promise<void> => {
  const filename = req.params.file as string;

  // Sanitizar nome do arquivo para evitar path traversal
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(DOWNLOADS_DIR, sanitizedFilename);

  // Verificar se o arquivo existe
  try {
    await fs.access(filePath);
  } catch {
    sendError(res, 404, 'FILE_NOT_FOUND', 'Arquivo não encontrado');
    return;
  }

  // Verificar se está dentro do diretório permitido
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(DOWNLOADS_DIR);
  if (!resolvedPath.startsWith(resolvedDir)) {
    sendError(res, 403, 'ACCESS_DENIED', 'Acesso negado');
    return;
  }

  // Enviar arquivo
  res.download(filePath, sanitizedFilename, (err) => {
    if (err) {
      console.error('Erro ao enviar arquivo:', err);
      if (!res.headersSent) {
        sendError(res, 500, 'DOWNLOAD_ERROR', 'Erro ao fazer download do arquivo');
      }
    }
  });
});

/**
 * GET /api/downloads/:file/integrity
 * Verificar integridade do arquivo (hash SHA256)
 */
router.get('/:file/integrity', rateLimiter.default, async (req, res): Promise<void> => {
  const filename = req.params.file as string;

  // Sanitizar nome do arquivo
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(DOWNLOADS_DIR, sanitizedFilename);

  // Verificar se o arquivo existe
  try {
    await fs.access(filePath);
  } catch {
    sendError(res, 404, 'FILE_NOT_FOUND', 'Arquivo não encontrado');
    return;
  }

  // Verificar se está dentro do diretório permitido
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(DOWNLOADS_DIR);
  if (!resolvedPath.startsWith(resolvedDir)) {
    sendError(res, 403, 'ACCESS_DENIED', 'Acesso negado');
    return;
  }

  try {
    // Ler arquivo e calcular hash
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const stats = await fs.stat(filePath);

    res.json(success({
      filename: sanitizedFilename,
      sha256: hash,
      size: stats.size,
      modified: stats.mtime,
    }));
  } catch (error) {
    console.error('Erro ao calcular hash:', error);
    sendError(res, 500, 'INTEGRITY_ERROR', 'Erro ao verificar integridade do arquivo');
  }
});

/**
 * GET /api/downloads/app/:appId
 * Obter URL de download do app (com verificação de licença)
 */
router.get('/app/:appId', rateLimiter.sensitive, async (req, res): Promise<void> => {
  const appId = Number(req.params.appId);
  const email = req.query.email as string;

  if (!email) {
    sendError(res, 400, 'EMAIL_REQUIRED', 'Email é obrigatório');
    return;
  }

  // Verificar se tem compra aprovada
  const payment = await prisma.payment.findFirst({
    where: {
      appId,
      payerEmail: email,
      status: 'approved',
    },
  });

  if (!payment) {
    sendError(res, 403, 'NO_LICENSE', 'Você não possui licença para este app');
    return;
  }

  // Buscar app
  const app = await prisma.app.findUnique({
    where: { id: appId },
    select: { executableUrl: true, name: true },
  });

  if (!app || !app.executableUrl) {
    sendError(res, 404, 'APP_NOT_FOUND', 'App ou download não encontrado');
    return;
  }

  // Incrementar contador de downloads
  await prisma.app.update({
    where: { id: appId },
    data: { downloadCount: { increment: 1 } },
  });

  res.json(success({
    download_url: app.executableUrl,
    app_name: app.name,
  }));
});

export default router;
