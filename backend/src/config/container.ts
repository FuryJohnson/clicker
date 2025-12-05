import { MongoUserRepository } from '../infrastructure/database/repositories/mongo-user.repository.js';
import {
  AuthUserUseCase,
  AddClicksUseCase,
  GetLeaderboardUseCase,
  GetUserUseCase,
  GetUserRankUseCase,
} from '../application/use-cases/index.js';
import { redis } from '../infrastructure/redis/connection.js';
import { RedisRateLimitStrategy } from '../infrastructure/redis/redis-rate-limit.strategy.js';
import { GlobalRateLimiter } from '../infrastructure/redis/global-rate-limit.js';
import { ClickBuffer } from '../infrastructure/redis/click-buffer.js';
import { LeaderboardCache } from '../infrastructure/redis/leaderboard-cache.js';
import { UserCache } from '../infrastructure/redis/user-cache.js';
import { ClicksSortedSet } from '../infrastructure/redis/clicks-sorted-set.js';

const userRepository = new MongoUserRepository();

export const userCache = new UserCache(redis);
export const leaderboardCache = new LeaderboardCache(redis);
export const clicksSortedSet = new ClicksSortedSet(redis);
export const clickBuffer = new ClickBuffer(redis, 5000);

clickBuffer.onFlush(async ({ flushedUsers }) => {
  if (flushedUsers.length === 0) return;

  await clicksSortedSet.bulkUpdate(
    flushedUsers.map((u) => ({ telegramId: u.telegramId, clicks: u.addedClicks }))
  );

  const shouldInvalidate = await leaderboardCache.shouldInvalidate(flushedUsers);
  if (shouldInvalidate) {
    await leaderboardCache.invalidate();
  }
});

export const authUserUseCase = new AuthUserUseCase(
  userRepository,
  userCache,
  clickBuffer,
  clicksSortedSet
);
export const addClicksUseCase = new AddClicksUseCase(userCache, clickBuffer, clicksSortedSet);
export const getLeaderboardUseCase = new GetLeaderboardUseCase(userRepository, leaderboardCache, clicksSortedSet);
export const getUserUseCase = new GetUserUseCase(userRepository, clickBuffer, clicksSortedSet);
export const getUserRankUseCase = new GetUserRankUseCase(clicksSortedSet, clickBuffer, userCache);

export const clickRateLimitStrategy = new RedisRateLimitStrategy(redis, 20, 1000);

const globalMaxRequests = parseInt(process.env.GLOBAL_RATE_LIMIT || '10000', 10);
const globalWindowMs = parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || '1000', 10);
export const globalRateLimiter = new GlobalRateLimiter(redis, globalMaxRequests, globalWindowMs);
