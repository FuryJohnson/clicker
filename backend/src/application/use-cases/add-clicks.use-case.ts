import { UserCache } from '../../infrastructure/redis/user-cache.js';
import { ClickBuffer } from '../../infrastructure/redis/click-buffer.js';
import { ClicksSortedSet } from '../../infrastructure/redis/clicks-sorted-set.js';

export interface AddClicksInput {
  telegramId: number;
  count: number;
}

export interface AddClicksOutput {
  clicks: number;
  buffered: number;
}

export class AddClicksUseCase {
  private static readonly MinClicks = 1;
  private static readonly MaxClicks = 100;

  invalidClickCountError = new Error(
    `Invalid click count (${AddClicksUseCase.MinClicks}-${AddClicksUseCase.MaxClicks})`
  );
  userNotFoundError = new Error('User not found');

  constructor(
    private readonly userCache: UserCache,
    private readonly clickBuffer: ClickBuffer,
    private readonly clicksSortedSet: ClicksSortedSet
  ) {}

  async execute(input: AddClicksInput): Promise<AddClicksOutput> {
    if (input.count < AddClicksUseCase.MinClicks || input.count > AddClicksUseCase.MaxClicks) {
      throw this.invalidClickCountError;
    }

    const exists = await this.userCache.exists(input.telegramId);
    if (exists === false) {
      throw this.userNotFoundError;
    }

    const [buffered, totalInSet] = await Promise.all([
      this.clickBuffer.addClicks(input.telegramId, input.count),
      this.clicksSortedSet.getScore(input.telegramId),
    ]);

    return { clicks: totalInSet + buffered, buffered };
  }
}
