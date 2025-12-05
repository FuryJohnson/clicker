import { describe, it, expect, vi } from 'vitest';
import { AddClicksUseCase } from '../../src/application/use-cases/add-clicks.use-case.js';
import { UserCache } from '../../src/infrastructure/redis/user-cache.js';
import { ClickBuffer } from '../../src/infrastructure/redis/click-buffer.js';
import { ClicksSortedSet } from '../../src/infrastructure/redis/clicks-sorted-set.js';

const createMockUserCache = (exists: boolean | null = true): Partial<UserCache> => ({
  exists: vi.fn().mockResolvedValue(exists),
});

const createMockClickBuffer = (bufferedClicks = 50): Partial<ClickBuffer> => ({
  addClicks: vi.fn().mockResolvedValue(bufferedClicks),
});

const createMockSortedSet = (score = 100): Partial<ClicksSortedSet> => ({
  getScore: vi.fn().mockResolvedValue(score),
});

describe('AddClicksUseCase', () => {
  it('adds clicks to buffer and returns total', async () => {
    const cache = createMockUserCache(true);
    const buffer = createMockClickBuffer(50);
    const sortedSet = createMockSortedSet(100);
    const useCase = new AddClicksUseCase(
      cache as UserCache,
      buffer as ClickBuffer,
      sortedSet as ClicksSortedSet
    );

    const result = await useCase.execute({ telegramId: 1, count: 50 });

    expect(result.clicks).toBe(150);
    expect(buffer.addClicks).toHaveBeenCalledWith(1, 50);
  });

  it('rejects count below 1', async () => {
    const useCase = new AddClicksUseCase(
      createMockUserCache() as UserCache,
      createMockClickBuffer() as ClickBuffer,
      createMockSortedSet() as ClicksSortedSet
    );

    await expect(useCase.execute({ telegramId: 1, count: 0 })).rejects.toThrow('Invalid click count');
  });

  it('rejects count above 100', async () => {
    const useCase = new AddClicksUseCase(
      createMockUserCache() as UserCache,
      createMockClickBuffer() as ClickBuffer,
      createMockSortedSet() as ClicksSortedSet
    );

    await expect(useCase.execute({ telegramId: 1, count: 101 })).rejects.toThrow('Invalid click count');
  });

  it('throws when user cache says user does not exist', async () => {
    const cache = createMockUserCache(false);
    const useCase = new AddClicksUseCase(
      cache as UserCache,
      createMockClickBuffer() as ClickBuffer,
      createMockSortedSet() as ClicksSortedSet
    );

    await expect(useCase.execute({ telegramId: 999, count: 10 })).rejects.toThrow('User not found');
  });

  it('allows clicks when cache returns null (unknown)', async () => {
    const cache = createMockUserCache(null);
    const buffer = createMockClickBuffer(10);
    const sortedSet = createMockSortedSet(50);
    const useCase = new AddClicksUseCase(
      cache as UserCache,
      buffer as ClickBuffer,
      sortedSet as ClicksSortedSet
    );

    const result = await useCase.execute({ telegramId: 1, count: 10 });

    expect(result.clicks).toBe(60);
  });
});
