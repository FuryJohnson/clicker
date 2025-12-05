import { ExtendedRedis } from './redis-commands.js';

export interface CachedLeader {
  rank: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  clicks: number;
}

export class LeaderboardCache {
  private readonly cacheKey = 'leaderboard:top25';
  private readonly thresholdKey = 'leaderboard:threshold';
  private readonly lockKey = 'leaderboard:lock';
  private readonly ttlSeconds = 5;
  private readonly lockTtlMs = 2000;

  constructor(private readonly redis: ExtendedRedis) {}

  async getTop25(): Promise<CachedLeader[] | null> {
    const cached = await this.redis.get(this.cacheKey);
    if (!cached) return null;
    return JSON.parse(cached);
  }

  async setTop25(leaders: CachedLeader[]): Promise<void> {
    const threshold = leaders.length > 0 ? leaders[leaders.length - 1].clicks : 0;

    const multi = this.redis.multi();
    multi.setex(this.cacheKey, this.ttlSeconds, JSON.stringify(leaders));
    multi.set(this.thresholdKey, String(threshold));
    await multi.exec();
  }

  async acquireLock(): Promise<boolean> {
    const result = await this.redis.acquireLock(this.lockKey, this.lockTtlMs);
    return result === 1;
  }

  async releaseLock(): Promise<void> {
    await this.redis.del(this.lockKey);
  }

  async getOrSet(fetchFn: () => Promise<CachedLeader[]>): Promise<CachedLeader[]> {
    const cached = await this.getTop25();
    if (cached) return cached;

    const hasLock = await this.acquireLock();
    if (!hasLock) {
      await this.waitForCache(50, 10);
      const afterWait = await this.getTop25();
      if (afterWait) return afterWait;
    }

    try {
      const doubleCheck = await this.getTop25();
      if (doubleCheck) return doubleCheck;

      const leaders = await fetchFn();
      await this.setTop25(leaders);
      return leaders;
    } finally {
      if (hasLock) {
        await this.releaseLock();
      }
    }
  }

  private async waitForCache(intervalMs: number, maxAttempts: number): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      const cached = await this.getTop25();
      if (cached) return;
    }
  }

  async getThreshold(): Promise<number> {
    const value = await this.redis.get(this.thresholdKey);
    return value ? parseInt(value, 10) : 0;
  }

  async shouldInvalidate(flushedUsers: { telegramId: number; addedClicks: number }[]): Promise<boolean> {
    if (flushedUsers.length === 0) return false;

    const threshold = await this.getThreshold();
    if (threshold === 0) return true;

    const maxAdded = Math.max(...flushedUsers.map((u) => u.addedClicks));
    return maxAdded >= threshold * 0.1;
  }

  async invalidate(): Promise<void> {
    await this.redis.del(this.cacheKey);
  }
}
