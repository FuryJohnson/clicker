import { ExtendedRedis } from './redis-commands.js';
import { UserModel } from '../database/models/user.model.js';
import { logger } from '../logging/logger.js';

export interface FlushedUser {
  telegramId: number;
  addedClicks: number;
}

export interface FlushResult {
  flushedUsers: FlushedUser[];
  flushedCount: number;
}

const BATCH_SIZE = 500;
const SCAN_COUNT = 1000;

export class ClickBuffer {
  private readonly bufferKey = 'clicks:buffer';
  private readonly processingKey = 'clicks:processing';
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private onFlushCallback: ((result: FlushResult) => Promise<void>) | null = null;

  constructor(
    private readonly redis: ExtendedRedis,
    private readonly flushIntervalMs: number = 5000
  ) {}

  async addClicks(telegramId: number, count: number): Promise<number> {
    return this.redis.hincrby(this.bufferKey, String(telegramId), count);
  }

  async getBufferedClicks(telegramId: number): Promise<number> {
    const [main, processing] = await Promise.all([
      this.redis.hget(this.bufferKey, String(telegramId)),
      this.redis.hget(this.processingKey, String(telegramId)),
    ]);

    const mainClicks = main ? parseInt(main, 10) : 0;
    const processingClicks = processing ? parseInt(processing, 10) : 0;

    return mainClicks + processingClicks;
  }

  async flush(): Promise<FlushResult> {
    if (this.isFlushing) {
      return { flushedUsers: [], flushedCount: 0 };
    }

    this.isFlushing = true;
    const allFlushed: FlushedUser[] = [];

    try {
      await this.recoverProcessing();

      let cursor = '0';
      do {
        const [nextCursor, fields] = await this.redis.hscan(
          this.bufferKey,
          cursor,
          'COUNT',
          SCAN_COUNT
        );
        cursor = nextCursor;

        if (fields.length === 0) continue;

        const batch: Array<{ telegramId: number; clicks: number }> = [];
        for (let i = 0; i < fields.length; i += 2) {
          const telegramId = parseInt(fields[i], 10);
          const clicks = parseInt(fields[i + 1], 10);
          batch.push({ telegramId, clicks });
        }

        const flushed = await this.processBatch(batch);
        allFlushed.push(...flushed);
      } while (cursor !== '0');

      if (this.onFlushCallback && allFlushed.length > 0) {
        await this.onFlushCallback({
          flushedUsers: allFlushed,
          flushedCount: allFlushed.length,
        });
      }

      return { flushedUsers: allFlushed, flushedCount: allFlushed.length };
    } finally {
      this.isFlushing = false;
    }
  }

  private async processBatch(
    entries: Array<{ telegramId: number; clicks: number }>
  ): Promise<FlushedUser[]> {
    if (entries.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const { telegramId, clicks } of entries) {
      pipeline.hset(this.processingKey, String(telegramId), clicks);
      pipeline.hdel(this.bufferKey, String(telegramId));
    }
    await pipeline.exec();

    return this.writeBatchToMongo(entries);
  }

  private async writeBatchToMongo(
    entries: Array<{ telegramId: number; clicks: number }>
  ): Promise<FlushedUser[]> {
    const flushed: FlushedUser[] = [];

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE);

      const operations = chunk.map(({ telegramId, clicks }) => ({
        updateOne: {
          filter: { telegramId },
          update: { $inc: { clicks } },
        },
      }));

      await UserModel.bulkWrite(operations, { ordered: false });

      const cleanPipeline = this.redis.pipeline();
      for (const { telegramId, clicks } of chunk) {
        cleanPipeline.hdel(this.processingKey, String(telegramId));
        flushed.push({ telegramId, addedClicks: clicks });
      }
      await cleanPipeline.exec();
    }

    return flushed;
  }

  private async recoverProcessing(): Promise<void> {
    const exists = await this.redis.exists(this.processingKey);
    if (!exists) return;

    let cursor = '0';
    do {
      const [nextCursor, fields] = await this.redis.hscan(
        this.processingKey,
        cursor,
        'COUNT',
        SCAN_COUNT
      );
      cursor = nextCursor;

      if (fields.length === 0) continue;

      const batch: Array<{ telegramId: number; clicks: number }> = [];
      for (let i = 0; i < fields.length; i += 2) {
        batch.push({
          telegramId: parseInt(fields[i], 10),
          clicks: parseInt(fields[i + 1], 10),
        });
      }

      await this.writeBatchToMongo(batch);
    } while (cursor !== '0');
  }

  onFlush(callback: (result: FlushResult) => Promise<void>): void {
    this.onFlushCallback = callback;
  }

  startPeriodicFlush(): void {
    if (this.flushInterval) return;

    this.flushInterval = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        logger.error('Click buffer flush error', error);
      }
    }, this.flushIntervalMs);
  }

  async stopPeriodicFlush(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    let retries = 0;
    while (retries < 10) {
      try {
        const result = await this.flush();
        if (result.flushedCount === 0) break;
        retries++;
      } catch {
        retries++;
      }
    }
  }
}
