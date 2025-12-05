import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimitMiddleware } from '../../src/interfaces/http/middleware/rate-limit.middleware.js';
import { SlidingWindowStrategy } from '../../src/domain/strategies/rate-limit.strategy.js';
import { AuthenticatedRequest } from '../../src/interfaces/http/middleware/telegram.middleware.js';
import { Response } from 'express';

const createMockReq = (userId: number): AuthenticatedRequest =>
  ({ telegramUser: { id: userId } }) as AuthenticatedRequest;

const createMockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  res.status = vi.fn().mockReturnValue(res);
  return res;
};

describe('Rate Limiting (anti-cheat)', () => {
  let strategy: SlidingWindowStrategy;
  let middleware: ReturnType<typeof createRateLimitMiddleware>;

  beforeEach(() => {
    vi.useFakeTimers();
    strategy = new SlidingWindowStrategy(20, 1000);
    middleware = createRateLimitMiddleware(strategy);
  });

  it('allows requests within limit', async () => {
    const req = createMockReq(1);
    const res = createMockRes();
    const next = vi.fn();

    for (let i = 0; i < 20; i++) {
      await middleware(req, res, next);
    }

    expect(next).toHaveBeenCalledTimes(20);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks requests exceeding 20/sec limit', async () => {
    const req = createMockReq(2);
    const res = createMockRes();
    const next = vi.fn();

    for (let i = 0; i < 25; i++) {
      await middleware(req, res, next);
    }

    expect(next).toHaveBeenCalledTimes(20);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Too many requests' }));
  });

  it('resets limit after 1 second', async () => {
    const req = createMockReq(3);
    const res = createMockRes();
    const next = vi.fn();

    for (let i = 0; i < 20; i++) {
      await middleware(req, res, next);
    }
    expect(next).toHaveBeenCalledTimes(20);

    vi.advanceTimersByTime(1001);

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(21);
  });

  it('tracks limits per user independently', async () => {
    const req1 = createMockReq(100);
    const req2 = createMockReq(200);
    const res = createMockRes();
    const next = vi.fn();

    for (let i = 0; i < 20; i++) {
      await middleware(req1, res, next);
    }

    await middleware(req2, res, next);

    expect(next).toHaveBeenCalledTimes(21);
  });
});

describe('SlidingWindowStrategy', () => {
  it('should allow requests within limit', () => {
    const strategy = new SlidingWindowStrategy(5, 1000);

    for (let i = 0; i < 5; i++) {
      expect(strategy.shouldAllow(1)).toBe(true);
    }

    expect(strategy.shouldAllow(1)).toBe(false);
  });

  it('should reset after window expires', () => {
    vi.useFakeTimers();
    const strategy = new SlidingWindowStrategy(5, 1000);

    for (let i = 0; i < 5; i++) {
      strategy.shouldAllow(1);
    }

    expect(strategy.shouldAllow(1)).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(strategy.shouldAllow(1)).toBe(true);
  });
});
