import { ExtendedRedis } from './redis-commands.js';

export class UserCache {
  private readonly keyPrefix = 'user:exists:';
  private readonly ttlSeconds = 300;

  constructor(private readonly redis: ExtendedRedis) {}

  async exists(telegramId: number): Promise<boolean | null> {
    const cached = await this.redis.get(this.getKey(telegramId));
    if (cached === null) return null;
    return cached === '1';
  }

  async setExists(telegramId: number, exists: boolean): Promise<void> {
    await this.redis.setex(this.getKey(telegramId), this.ttlSeconds, exists ? '1' : '0');
  }

  async invalidate(telegramId: number): Promise<void> {
    await this.redis.del(this.getKey(telegramId));
  }

  private getKey(telegramId: number): string {
    return `${this.keyPrefix}${telegramId}`;
  }
}

