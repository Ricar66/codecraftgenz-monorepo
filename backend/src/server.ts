import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './db/prisma.js';
import { startNewsCron } from './services/news.cron.js';
import { startEmailDripCron } from './jobs/email-drip.job.js';
import cron from 'node-cron';
import { runBackupJob } from './jobs/backup.job.js';

const PORT = env.PORT;

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 URL: http://localhost:${PORT}`);

  // Test database connection in background
  prisma.$queryRaw`SELECT 1`
    .then(() => {
      logger.info('✅ Database connected');
      startNewsCron();
      startEmailDripCron();

      // Backup diário às 3h
      cron.schedule('0 3 * * *', async () => {
        try {
          await runBackupJob();
        } catch (err) {
          logger.error({ err }, 'Backup job failed');
        }
      });
      logger.info('Backup cron job scheduled (daily at 03:00)');
    })
    .catch((err) => {
      logger.error({ err }, '❌ Database connection failed');
      logger.warn('⚠️ Server running but database unavailable');
    });
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (err) {
      logger.error({ err }, 'Error disconnecting database');
    }

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

export default server;
