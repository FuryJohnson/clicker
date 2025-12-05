import { describe, it, expect, vi } from 'vitest';
import { AuthUserUseCase } from '../../src/application/use-cases/auth-user.use-case.js';
import { UserRepository } from '../../src/domain/repositories/user.repository.js';
import { UserCache } from '../../src/infrastructure/redis/user-cache.js';
import { ClickBuffer } from '../../src/infrastructure/redis/click-buffer.js';
import { ClicksSortedSet } from '../../src/infrastructure/redis/clicks-sorted-set.js';

const mockUser = {
  telegramId: 123,
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  clicks: 50,
};

const createMockRepo = (): UserRepository => ({
  findByTelegramId: vi.fn(),
  findByTelegramIds: vi.fn(),
  create: vi.fn().mockResolvedValue({ ...mockUser, clicks: 0 }),
  update: vi.fn().mockResolvedValue(mockUser),
  incrementClicks: vi.fn(),
  getTopUsers: vi.fn(),
  countUsersWithMoreClicks: vi.fn(),
});

const createMockUserCache = (exists: boolean | null = null): Partial<UserCache> => ({
  exists: vi.fn().mockResolvedValue(exists),
  setExists: vi.fn(),
});

const createMockClickBuffer = (buffered = 0): Partial<ClickBuffer> => ({
  getBufferedClicks: vi.fn().mockResolvedValue(buffered),
});

const createMockSortedSet = (score = 0): Partial<ClicksSortedSet> => ({
  getScore: vi.fn().mockResolvedValue(score),
  updateScore: vi.fn(),
});

describe('AuthUserUseCase', () => {
  it('creates new user if not exists', async () => {
    const repo = createMockRepo();
    repo.findByTelegramId = vi.fn().mockResolvedValue(null);
    const cache = createMockUserCache(null);
    const buffer = createMockClickBuffer(0);
    const sortedSet = createMockSortedSet(0);
    const useCase = new AuthUserUseCase(
      repo,
      cache as UserCache,
      buffer as ClickBuffer,
      sortedSet as ClicksSortedSet
    );

    const result = await useCase.execute({
      telegramId: 123,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(repo.create).toHaveBeenCalled();
    expect(cache.setExists).toHaveBeenCalledWith(123, true);
    expect(result.clicks).toBe(0);
  });

  it('updates existing user when data changed', async () => {
    const repo = createMockRepo();
    repo.findByTelegramId = vi.fn().mockResolvedValue(mockUser);
    const cache = createMockUserCache(true);
    const buffer = createMockClickBuffer(10);
    const sortedSet = createMockSortedSet(50);
    const useCase = new AuthUserUseCase(
      repo,
      cache as UserCache,
      buffer as ClickBuffer,
      sortedSet as ClicksSortedSet
    );

    const result = await useCase.execute({
      telegramId: 123,
      username: 'newname',
      firstName: 'New',
      lastName: 'Name',
    });

    expect(repo.update).toHaveBeenCalled();
    expect(result.clicks).toBe(60);
  });

  it('skips update when data not changed', async () => {
    const repo = createMockRepo();
    repo.findByTelegramId = vi.fn().mockResolvedValue(mockUser);
    const cache = createMockUserCache(true);
    const buffer = createMockClickBuffer(0);
    const sortedSet = createMockSortedSet(50);
    const useCase = new AuthUserUseCase(
      repo,
      cache as UserCache,
      buffer as ClickBuffer,
      sortedSet as ClicksSortedSet
    );

    await useCase.execute({
      telegramId: 123,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(repo.update).not.toHaveBeenCalled();
  });

  it('creates user when cache says not exists', async () => {
    const repo = createMockRepo();
    const cache = createMockUserCache(false);
    const buffer = createMockClickBuffer(0);
    const sortedSet = createMockSortedSet(0);
    const useCase = new AuthUserUseCase(
      repo,
      cache as UserCache,
      buffer as ClickBuffer,
      sortedSet as ClicksSortedSet
    );

    const result = await useCase.execute({
      telegramId: 123,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(repo.create).toHaveBeenCalled();
    expect(repo.findByTelegramId).not.toHaveBeenCalled();
    expect(result.clicks).toBe(0);
  });

  it('initializes sorted set from MongoDB when Redis is empty but DB has clicks', async () => {
    const repo = createMockRepo();
    repo.findByTelegramId = vi.fn().mockResolvedValue(mockUser);
    const cache = createMockUserCache(true);
    const buffer = createMockClickBuffer(5);
    const sortedSet = createMockSortedSet(0);
    const useCase = new AuthUserUseCase(
      repo,
      cache as UserCache,
      buffer as ClickBuffer,
      sortedSet as ClicksSortedSet
    );

    const result = await useCase.execute({
      telegramId: 123,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(sortedSet.updateScore).toHaveBeenCalledWith(123, 50);
    expect(result.clicks).toBe(55);
  });
});
