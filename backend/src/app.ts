import express from 'express';
import cors from 'cors';
import helmetModule from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env.js';

// Handle ESM/CJS interop for helmet
const helmet = (helmetModule as unknown as { default?: typeof helmetModule }).default ?? helmetModule;
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { defaultLimiter } from './middlewares/rateLimiter.js';
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
const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, Postman, etc.)
      if (!origin) return callback(null, true);

      // Allow configured origins
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost in development
      if (!isProd && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      logger.warn({ origin }, 'CORS blocked');
      return callback(new Error('CORS origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  })
);

// HSTS in production
if (isProd) {
  app.use(helmetModule.hsts({ maxAge: 15552000 }));
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
