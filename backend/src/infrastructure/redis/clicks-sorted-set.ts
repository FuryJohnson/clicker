import { ExtendedRedis } from './redis-commands.js';

export class ClicksSortedSet {
  private readonly key = 'clicks:ranking';

  constructor(private readonly redis: ExtendedRedis) {}

  async updateScore(telegramId: number, totalClicks: number): Promise<void> {
    await this.redis.zadd(this.key, totalClicks, String(telegramId));
  }

  async incrementScore(telegramId: number, increment: number): Promise<number> {
    const result = await this.redis.zincrby(this.key, increment, String(telegramId));
    return parseFloat(result);
  }

  async getRank(telegramId: number): Promise<number | null> {
    const rank = await this.redis.zrevrank(this.key, String(telegramId));
    return rank !== null ? rank + 1 : null;
  }

  async getScore(telegramId: number): Promise<number> {
    const score = await this.redis.zscore(this.key, String(telegramId));
    return score ? parseFloat(score) : 0;
  }

  async getRankWithScore(
    telegramId: number
  ): Promise<{ rank: number; clicks: number } | null> {
    const pipeline = this.redis.pipeline();
    pipeline.zrevrank(this.key, String(telegramId));
    pipeline.zscore(this.key, String(telegramId));

    const results = await pipeline.exec();
    if (!results) return null;

    const [rankResult, scoreResult] = results;
    const rank = rankResult?.[1] as number | null;
    const score = scoreResult?.[1] as string | null;

    if (rank === null) return null;

    return {
      rank: rank + 1,
      clicks: score ? parseFloat(score) : 0,
    };
  }

  async getTopUsers(
    limit: number
  ): Promise<Array<{ telegramId: number; clicks: number; rank: number }>> {
    const result = await this.redis.zrevrange(this.key, 0, limit - 1, 'WITHSCORES');

    const users: Array<{ telegramId: number; clicks: number; rank: number }> = [];
    for (let i = 0; i < result.length; i += 2) {
      users.push({
        telegramId: parseInt(result[i], 10),
        clicks: parseFloat(result[i + 1]),
        rank: users.length + 1,
      });
    }

    return users;
  }

  async bulkUpdate(
    updates: Array<{ telegramId: number; clicks: number }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const { telegramId, clicks } of updates) {
      pipeline.zincrby(this.key, clicks, String(telegramId));
    }
    await pipeline.exec();
  }

  async initFromMongo(
    users: Array<{ telegramId: number; clicks: number }>
  ): Promise<void> {
    if (users.length === 0) return;

    const args: (string | number)[] = [this.key];
    for (const { telegramId, clicks } of users) {
      args.push(clicks, String(telegramId));
    }

    await this.redis.zadd(...(args as [string, ...Array<string | number>]));
  }

  async exists(): Promise<boolean> {
    const count = await this.redis.zcard(this.key);
    return count > 0;
  }
}

