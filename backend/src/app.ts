import express from 'express';
import cors from 'cors';
import helmet, { hsts } from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { defaultLimiter } from './middlewares/rateLimiter.js';
import { noCache } from './middlewares/cache.js';
import routes from './routes/index.js';

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
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
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

// Routes
app.use(routes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
