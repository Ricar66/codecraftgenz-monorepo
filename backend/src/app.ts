import express from 'express';
import cors from 'cors';
import helmet, { hsts } from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env, isProd } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { defaultLimiter } from './middlewares/rateLimiter.js';
import { noCache } from './middlewares/cache.js';
import routes from './routes/index.js';

// Diretório de downloads
const DOWNLOADS_DIR = env.DOWNLOADS_DIR || path.join(process.cwd(), 'public', 'downloads');

// Create Express app
const app = express();

// Trust proxy (for rate limiters behind Nginx/Cloudflare)
app.set('trust proxy', 1);

// Remove X-Powered-By header
app.disable('x-powered-by');

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Let frontend handle CSP
  })
);

// CORS
const normalize = (o: string) => {
  const s = o.trim().replace(/`/g, '');
  try {
    const u = new URL(s);
    return u.origin.toLowerCase().replace(/\/+$/, '');
  } catch {
    return s.toLowerCase().replace(/\/+$/, '');
  }
};
const hostEqual = (a: string, b: string) => {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const ha = ua.hostname.toLowerCase();
    const hb = ub.hostname.toLowerCase();
    return ha === hb || ha === `www.${hb}` || `www.${ha}` === hb;
  } catch {
    return false;
  }
};
const configuredOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
const extraOrigins = [
  env.FRONTEND_URL,
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()) : []),
].filter(Boolean);
const allowedOrigins = [...configuredOrigins, ...extraOrigins].map(normalize);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const o = normalize(origin);
      if (allowedOrigins.includes(o)) return callback(null, true);
      if (allowedOrigins.some((a) => hostEqual(o, a))) return callback(null, true);
      if (!isProd && /^https?:\/\/localhost(:\d+)?$/.test(o)) return callback(null, true);
      logger.warn({ origin: o }, 'CORS blocked');
      return callback(new Error('CORS origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-csrf-token',
      'x-device-id',
      'x-mp-device-id',
      'x-tracking-id',
      'x-idempotency-key',
    ],
  })
);

// HSTS in production
if (isProd) {
  app.use(hsts({ maxAge: 15552000 }));
}

// Compression
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Rate limiting
app.use(defaultLimiter);

// Cache-Control: no-cache para todas as rotas de API
// Isso garante que o navegador sempre busque dados atualizados
app.use('/api', noCache);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// Rota de download (sem /api, compatibilidade com server.js antigo)
app.get('/downloads/:file', async (req, res) => {
  try {
    const ua = String(req.headers['user-agent'] || 'unknown');
    const ip = req.ip || '';
    const safeName = path.basename(String(req.params.file || '').trim());
    const filePath = path.join(DOWNLOADS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      logger.warn({ ip, ua, file: safeName }, 'DOWNLOAD 404');
      res.status(404).json({ error: 'Arquivo não encontrado', file: safeName });
      return;
    }

    const stat = fs.statSync(filePath);
    const size = stat.size;
    const ext = path.extname(safeName).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.exe': 'application/x-msdownload',
      '.msi': 'application/x-msi',
      '.zip': 'application/zip',
      '.7z': 'application/x-7z-compressed',
    };
    const ctype = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', ctype);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Length', String(size));
    res.setHeader('Cache-Control', 'private, max-age=86400, no-transform');
    res.setHeader('Accept-Ranges', 'bytes');

    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => {
      try {
        const sha256 = hash.digest('hex');
        res.setHeader('X-File-SHA256', sha256);
        logger.info({ file: safeName, size, sha256, ip, ua }, 'DOWNLOAD OK');
      } catch (e) { void e; }
    });
    stream.on('error', (err) => {
      logger.error({ file: safeName, message: err?.message || String(err) }, 'DOWNLOAD STREAM ERROR');
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  } catch (err) {
    logger.error({ error: err }, 'DOWNLOAD ERROR');
    res.status(500).json({ error: 'Falha ao enviar arquivo para download' });
  }
});

// Routes
app.use(routes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
