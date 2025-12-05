import { User } from '../../domain/entities/user.entity.js';
import { UserRepository } from '../../domain/repositories/user.repository.js';
import { UserCache } from '../../infrastructure/redis/user-cache.js';
import { ClickBuffer } from '../../infrastructure/redis/click-buffer.js';
import { ClicksSortedSet } from '../../infrastructure/redis/clicks-sorted-set.js';
import { logger } from '../../infrastructure/logging/logger.js';

export interface AuthUserInput {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
}

export interface AuthUserOutput {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  clicks: number;
  photoUrl?: string;
}

export class AuthUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userCache: UserCache,
    private readonly clickBuffer: ClickBuffer,
    private readonly clicksSortedSet: ClicksSortedSet
  ) {}

  async execute(input: AuthUserInput): Promise<AuthUserOutput> {
    const cachedExists = await this.userCache.exists(input.telegramId);

    const [result, photoUrl] = await Promise.all([
      cachedExists === true
        ? this.handleExistingUser(input)
        : cachedExists === false
        ? this.handleNewUser(input)
        : this.handleUnknownUser(input),
      this.getUserPhoto(input.telegramId),
    ]);

    return {
      ...result,
      photoUrl,
    };
  }

  private async handleExistingUser(input: AuthUserInput): Promise<AuthUserOutput> {
    const [user, bufferedClicks, sortedSetClicks] = await Promise.all([
      this.userRepository.findByTelegramId(input.telegramId),
      this.clickBuffer.getBufferedClicks(input.telegramId),
      this.clicksSortedSet.getScore(input.telegramId),
    ]);

    if (!user) {
      await this.userCache.setExists(input.telegramId, false);
      return this.handleNewUser(input);
    }

    const promises: Promise<unknown>[] = [];

    if (this.needsUpdate(user, input)) {
      promises.push(
        this.userRepository.update(input.telegramId, {
          username: input.username,
          firstName: input.firstName,
          lastName: input.lastName,
        })
      );
    }

    let clicks = sortedSetClicks + bufferedClicks;

    if (sortedSetClicks === 0 && user.clicks > 0) {
      logger.info('Initializing sorted set from MongoDB', {
        telegramId: input.telegramId,
        dbClicks: user.clicks,
      });
      promises.push(this.clicksSortedSet.updateScore(input.telegramId, user.clicks));
      clicks = user.clicks + bufferedClicks;
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    return {
      telegramId: user.telegramId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      clicks,
    };
  }

  private async handleNewUser(input: AuthUserInput): Promise<AuthUserOutput> {
    const user = await this.userRepository.create({
      telegramId: input.telegramId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    await Promise.all([
      this.userCache.setExists(input.telegramId, true),
      this.clicksSortedSet.updateScore(input.telegramId, 0),
    ]);

    return this.toOutput(user, 0);
  }

  private async handleUnknownUser(input: AuthUserInput): Promise<AuthUserOutput> {
    const [user, bufferedClicks, sortedSetClicks] = await Promise.all([
      this.userRepository.findByTelegramId(input.telegramId),
      this.clickBuffer.getBufferedClicks(input.telegramId),
      this.clicksSortedSet.getScore(input.telegramId),
    ]);

    if (!user) {
      return this.handleNewUser(input);
    }

    const promises: Promise<unknown>[] = [
      this.userCache.setExists(input.telegramId, true),
    ];

    let clicks = sortedSetClicks + bufferedClicks;

    if (sortedSetClicks === 0 && user.clicks > 0) {
      logger.info('Initializing sorted set from MongoDB', {
        telegramId: input.telegramId,
        dbClicks: user.clicks,
      });
      promises.push(this.clicksSortedSet.updateScore(input.telegramId, user.clicks));
      clicks = user.clicks + bufferedClicks;
    }

    if (this.needsUpdate(user, input)) {
      promises.push(
        this.userRepository.update(input.telegramId, {
          username: input.username,
          firstName: input.firstName,
          lastName: input.lastName,
        })
      );
    }

    await Promise.all(promises);

    return {
      telegramId: user.telegramId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      clicks,
    };
  }

  private needsUpdate(user: User, input: AuthUserInput): boolean {
    return (
      user.username !== input.username ||
      user.firstName !== input.firstName ||
      user.lastName !== input.lastName
    );
  }

  private toOutput(user: User, bufferedClicks: number): AuthUserOutput {
    return {
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      clicks: user.clicks + bufferedClicks,
    };
  }

  private async getUserPhoto(userId: number): Promise<string | undefined> {
    try {
      const botToken = process.env.BOT_TOKEN;
      if (!botToken || botToken === 'test_token_for_development') {
        return undefined;
      }

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${userId}&limit=1`
      );
      
      const data = await response.json() as {
        ok: boolean;
        result?: {
          total_count: number;
          photos: Array<Array<{ file_id: string }>>;
        };
      };
      
      if (data.ok && data.result && data.result.total_count > 0) {
        const photo = data.result.photos[0];
        const fileId = photo[photo.length - 1].file_id;
        
        const fileResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
        );
        const fileData = await fileResponse.json() as {
          ok: boolean;
          result?: {
            file_path: string;
          };
        };
        
        if (fileData.ok && fileData.result) {
          return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        }
      }
      
      return undefined;
    } catch (error) {
      logger.error('Failed to get user photo', error, { userId });
      return undefined;
    }
  }
}