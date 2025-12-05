import { ExtendedRedis } from './redis-commands.js';

export class GlobalRateLimiter {
  private readonly key = 'ratelimit:global';

  constructor(
    private readonly redis: ExtendedRedis,
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  async shouldAllow(): Promise<boolean> {
    const result = await this.redis.rateLimit(this.key, this.maxRequests, this.windowMs);
    return result === 1;
  }
}

