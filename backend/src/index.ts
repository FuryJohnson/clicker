import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB, disconnectDB } from './infrastructure/database/connection.js';
import { redis } from './infrastructure/redis/connection.js';
import { apiRoutes } from './interfaces/http/routes/index.js';
import { errorHandler } from './interfaces/http/middleware/error.middleware.js';
import { createGlobalRateLimitMiddleware } from './interfaces/http/middleware/global-rate-limit.middleware.js';
import { clickBuffer, globalRateLimiter } from './config/container.js';
import { logger } from './infrastructure/logging/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Telegram-Init-Data'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', createGlobalRateLimitMiddleware(globalRateLimiter), apiRoutes);

app.get('/health', async (_, res) => {
  const redisStatus = redis.status === 'ready' ? 'ok' : 'error';
  const status = redisStatus === 'ok' ? 'ok' : 'degraded';
  res.json({ status, redis: redisStatus });
});

app.use(errorHandler);

const start = async (): Promise<void> => {
  await connectDB();

  clickBuffer.startPeriodicFlush();
  logger.info('Click buffer periodic flush started', { intervalMs: 5000 });

  const server = app.listen(PORT, () => {
    logger.info('Server running', { port: PORT });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Shutdown signal received', { signal });

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await clickBuffer.stopPeriodicFlush();
        logger.info('Click buffer flushed');

        await disconnectDB();
        logger.info('MongoDB disconnected');

        redis.disconnect();
        logger.info('Redis disconnected');

        process.exit(0);
      } catch (error) {
        logger.error('Shutdown error', error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
