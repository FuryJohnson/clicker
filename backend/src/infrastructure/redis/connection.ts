import Redis from 'ioredis';
import { createExtendedRedis, ExtendedRedis } from './redis-commands.js';
import { logger } from '../logging/logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const baseRedis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

baseRedis.on('connect', () => {
  logger.info('Redis connected');
});

baseRedis.on('error', (err) => {
  logger.error('Redis error', err);
});

export const redis: ExtendedRedis = createExtendedRedis(baseRedis);

