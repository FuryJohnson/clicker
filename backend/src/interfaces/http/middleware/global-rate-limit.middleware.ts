import { Request, Response, NextFunction } from 'express';
import { GlobalRateLimiter } from '../../../infrastructure/redis/global-rate-limit.js';

export const createGlobalRateLimitMiddleware = (limiter: GlobalRateLimiter) => {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const allowed = await limiter.shouldAllow();
    
    if (!allowed) {
      res.status(503).json({ error: 'Server overloaded, try again later' });
      return;
    }

    next();
  };
};

