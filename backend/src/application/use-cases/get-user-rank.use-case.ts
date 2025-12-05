import { ClicksSortedSet } from '../../infrastructure/redis/clicks-sorted-set.js';
import { ClickBuffer } from '../../infrastructure/redis/click-buffer.js';
import { UserCache } from '../../infrastructure/redis/user-cache.js';

export interface GetUserRankOutput {
  rank: number;
  clicks: number;
}

export class GetUserRankUseCase {
  userNotFoundError = new Error('User not found');

  constructor(
    private readonly clicksSortedSet: ClicksSortedSet,
    private readonly clickBuffer: ClickBuffer,
    private readonly userCache: UserCache
  ) {}

  async execute(telegramId: number): Promise<GetUserRankOutput> {
    const exists = await this.userCache.exists(telegramId);
    if (exists === false) {
      throw this.userNotFoundError;
    }

    const [rankData, bufferedClicks] = await Promise.all([
      this.clicksSortedSet.getRankWithScore(telegramId),
      this.clickBuffer.getBufferedClicks(telegramId),
    ]);

    if (!rankData) {
      throw this.userNotFoundError;
    }

    return {
      rank: rankData.rank,
      clicks: rankData.clicks + bufferedClicks,
    };
  }
}
