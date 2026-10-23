import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`CareSure Backend Server listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Health check: http://localhost:${env.PORT}/health`);
    logger.info(`Readiness: http://localhost:${env.PORT}/ready`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await disconnectDB();
      logger.info('HTTP server closed. Exiting process.');
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
