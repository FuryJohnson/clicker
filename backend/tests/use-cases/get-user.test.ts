import { describe, it, expect, vi } from 'vitest';
import { GetUserUseCase } from '../../src/application/use-cases/get-user.use-case.js';
import { UserRepository } from '../../src/domain/repositories/user.repository.js';
import { ClickBuffer } from '../../src/infrastructure/redis/click-buffer.js';
import { ClicksSortedSet } from '../../src/infrastructure/redis/clicks-sorted-set.js';

const mockUser = {
  telegramId: 123,
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  clicks: 100,
};

const createMockRepo = (): UserRepository => ({
  findByTelegramId: vi.fn().mockResolvedValue(mockUser),
  findByTelegramIds: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  incrementClicks: vi.fn(),
  getTopUsers: vi.fn(),
  countUsersWithMoreClicks: vi.fn(),
});

const createMockClickBuffer = (buffered = 0): Partial<ClickBuffer> => ({
  getBufferedClicks: vi.fn().mockResolvedValue(buffered),
});

const createMockSortedSet = (score = 0): Partial<ClicksSortedSet> => ({
  getScore: vi.fn().mockResolvedValue(score),
});

describe('GetUserUseCase', () => {
  it('returns user data with clicks from sorted set', async () => {
    const repo = createMockRepo();
    const buffer = createMockClickBuffer(10);
    const sortedSet = createMockSortedSet(100);
    const useCase = new GetUserUseCase(
      repo,
      buffer as ClickBuffer,
      sortedSet as ClicksSortedSet
    );

    const result = await useCase.execute(123);

    expect(result.telegramId).toBe(123);
    expect(result.clicks).toBe(110);
  });

  it('falls back to user.clicks when sorted set is empty', async () => {
    const repo = createMockRepo();
    const buffer = createMockClickBuffer(5);
    const sortedSet = createMockSortedSet(0);
    const useCase = new GetUserUseCase(
      repo,
      buffer as ClickBuffer,
      sortedSet as ClicksSortedSet
    );

    const result = await useCase.execute(123);

    expect(result.clicks).toBe(105);
  });

  it('throws when user not found', async () => {
    const repo = createMockRepo();
    repo.findByTelegramId = vi.fn().mockResolvedValue(null);
    const useCase = new GetUserUseCase(
      repo,
      createMockClickBuffer() as ClickBuffer,
      createMockSortedSet() as ClicksSortedSet
    );

    await expect(useCase.execute(999)).rejects.toThrow('User not found');
  });
});

