import { describe, it, expect, vi } from 'vitest';
import { GetLeaderboardUseCase } from '../../src/application/use-cases/get-leaderboard.use-case.js';
import { UserRepository } from '../../src/domain/repositories/user.repository.js';
import { LeaderboardCache } from '../../src/infrastructure/redis/leaderboard-cache.js';
import { ClicksSortedSet } from '../../src/infrastructure/redis/clicks-sorted-set.js';

const topUsers = [
  { telegramId: 1, firstName: 'First', username: null, lastName: null, clicks: 100 },
  { telegramId: 2, firstName: 'Second', username: 'second', lastName: null, clicks: 80 },
  { telegramId: 3, firstName: 'Third', username: null, lastName: null, clicks: 60 },
];

const topFromRedis = [
  { telegramId: 1, clicks: 100, rank: 1 },
  { telegramId: 2, clicks: 80, rank: 2 },
  { telegramId: 3, clicks: 60, rank: 3 },
];

const createMockRepo = (): UserRepository => ({
  findByTelegramId: vi.fn(),
  findByTelegramIds: vi.fn().mockResolvedValue(topUsers),
  create: vi.fn(),
  update: vi.fn(),
  incrementClicks: vi.fn(),
  getTopUsers: vi.fn().mockResolvedValue(topUsers),
  countUsersWithMoreClicks: vi.fn(),
});

const createMockSortedSet = (): Partial<ClicksSortedSet> => ({
  getTopUsers: vi.fn().mockResolvedValue(topFromRedis),
});

const createMockCache = (): Partial<LeaderboardCache> => ({
  getOrSet: vi.fn().mockImplementation(async (fn) => fn()),
});

const createMockCacheWithData = (data: unknown[]): Partial<LeaderboardCache> => ({
  getOrSet: vi.fn().mockResolvedValue(data),
});

describe('GetLeaderboardUseCase', () => {
  it('returns cached leaders when available', async () => {
    const cachedLeaders = [{ rank: 1, telegramId: 1, firstName: 'Cached', clicks: 200 }];
    const cache = createMockCacheWithData(cachedLeaders);
    const repo = createMockRepo();
    const sortedSet = createMockSortedSet();
    const useCase = new GetLeaderboardUseCase(repo, cache as LeaderboardCache, sortedSet as ClicksSortedSet);

    const result = await useCase.execute();

    expect(result.leaders).toEqual(cachedLeaders);
  });

  it('fetches from Redis sorted set on cache miss', async () => {
    const cache = createMockCache();
    const repo = createMockRepo();
    const sortedSet = createMockSortedSet();
    const useCase = new GetLeaderboardUseCase(repo, cache as LeaderboardCache, sortedSet as ClicksSortedSet);

    const result = await useCase.execute();

    expect(result.leaders).toHaveLength(3);
    expect(result.leaders[0].rank).toBe(1);
    expect(result.leaders[0].clicks).toBe(100);
    expect(sortedSet.getTopUsers).toHaveBeenCalledWith(25);
    expect(repo.findByTelegramIds).toHaveBeenCalledWith([1, 2, 3]);
  });
});
