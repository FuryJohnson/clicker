import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './telegram.middleware.js';
import { RateLimitStrategy } from '../../../domain/strategies/rate-limit.strategy.js';

export const createRateLimitMiddleware = (strategy: RateLimitStrategy) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.telegramUser?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const allowed = await strategy.shouldAllow(userId);
    if (!allowed) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    next();
  };
};
