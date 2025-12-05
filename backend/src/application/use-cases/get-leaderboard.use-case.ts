import { UserRepository } from '../../domain/repositories/user.repository.js';
import { LeaderboardCache, CachedLeader } from '../../infrastructure/redis/leaderboard-cache.js';
import { ClicksSortedSet } from '../../infrastructure/redis/clicks-sorted-set.js';

export interface LeaderEntry {
  rank: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  clicks: number;
}

export interface GetLeaderboardOutput {
  leaders: LeaderEntry[];
}

export class GetLeaderboardUseCase {
  private static readonly TopLimit = 25;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly leaderboardCache: LeaderboardCache,
    private readonly clicksSortedSet: ClicksSortedSet
  ) {}

  async execute(): Promise<GetLeaderboardOutput> {
    const leaders = await this.leaderboardCache.getOrSet(async () => {
      const topFromRedis = await this.clicksSortedSet.getTopUsers(GetLeaderboardUseCase.TopLimit);
      
      const telegramIds = topFromRedis.map((u) => u.telegramId);
      const users = await this.userRepository.findByTelegramIds(telegramIds);
      
      const userMap = new Map(users.map((u) => [u.telegramId, u]));
      
      return topFromRedis.map((redisUser) => {
        const user = userMap.get(redisUser.telegramId);
        return {
          rank: redisUser.rank,
          telegramId: redisUser.telegramId,
          username: user?.username || null,
          firstName: user?.firstName || 'Unknown',
          lastName: user?.lastName || null,
          clicks: redisUser.clicks,
        };
      });
    });

    return { leaders };
  }
}
