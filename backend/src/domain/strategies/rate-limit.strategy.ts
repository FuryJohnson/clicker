export interface RateLimitStrategy {
  shouldAllow(userId: number): boolean | Promise<boolean>;
  reset(userId: number): void | Promise<void>;
}

export class SlidingWindowStrategy implements RateLimitStrategy {
  private readonly requests = new Map<number, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  shouldAllow(userId: number): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.requests.get(userId) ?? [];
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(userId, validTimestamps);
    return true;
  }

  reset(userId: number): void {
    this.requests.delete(userId);
  }
}
