import { RateLimitStrategy } from '../../domain/strategies/rate-limit.strategy.js';
import { ExtendedRedis } from './redis-commands.js';

export class RedisRateLimitStrategy implements RateLimitStrategy {
  private readonly keyPrefix = 'ratelimit:';

  constructor(
    private readonly redis: ExtendedRedis,
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  async shouldAllow(userId: number): Promise<boolean> {
    const key = this.getKey(userId);
    const result = await this.redis.rateLimit(key, this.maxRequests, this.windowMs);
    return result === 1;
  }

  async reset(userId: number): Promise<void> {
    await this.redis.del(this.getKey(userId));
  }

  private getKey(userId: number): string {
    return `${this.keyPrefix}${userId}`;
  }
}
