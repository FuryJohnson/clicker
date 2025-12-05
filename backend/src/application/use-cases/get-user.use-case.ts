import { UserRepository } from '../../domain/repositories/user.repository.js';
import { ClickBuffer } from '../../infrastructure/redis/click-buffer.js';
import { ClicksSortedSet } from '../../infrastructure/redis/clicks-sorted-set.js';

export interface GetUserOutput {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  clicks: number;
}

export class GetUserUseCase {
  userNotFoundError = new Error('User not found');

  constructor(
    private readonly userRepository: UserRepository,
    private readonly clickBuffer: ClickBuffer,
    private readonly clicksSortedSet: ClicksSortedSet
  ) {}

  async execute(telegramId: number): Promise<GetUserOutput> {
    const [user, bufferedClicks, sortedSetClicks] = await Promise.all([
      this.userRepository.findByTelegramId(telegramId),
      this.clickBuffer.getBufferedClicks(telegramId),
      this.clicksSortedSet.getScore(telegramId),
    ]);

    if (!user) {
      throw this.userNotFoundError;
    }

    const clicks = sortedSetClicks > 0 
      ? sortedSetClicks + bufferedClicks 
      : user.clicks + bufferedClicks;

    return {
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      clicks,
    };
  }
}
