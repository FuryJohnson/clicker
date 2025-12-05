import { AddClicksCommand, AddClicksFn, ClicksResult } from './click.command';

const MAX_RETRY_DELAY_MS = 5000;
const BASE_RETRY_DELAY_MS = 500;
const MAX_PENDING_CLICKS = 10000;
const STORAGE_KEY = 'clicker_pending_clicks';

const loadPersistedClicks = (): number => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      localStorage.removeItem(STORAGE_KEY);
      const count = parseInt(stored, 10);
      return isNaN(count) ? 0 : Math.min(count, MAX_PENDING_CLICKS);
    }
  } catch { /* storage unavailable */ }
  return 0;
};

const persistClicks = (count: number): void => {
  if (count <= 0) return;
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.min(count, MAX_PENDING_CLICKS)));
  } catch { /* storage unavailable */ }
};

export class ClickCommandQueue {
  private pendingCount = 0;
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private onSuccess: ((result: ClicksResult) => void) | null = null;
  private onError: (() => void) | null = null;
  private onOverflow: (() => void) | null = null;
  private consecutiveErrors = 0;
  private isFlushing = false;
  private isDisposed = false;
  private beforeUnloadHandler: (() => void) | null = null;

  constructor(
    private readonly addClicks: AddClicksFn,
    private readonly batchDelayMs: number
  ) {
    this.pendingCount = loadPersistedClicks();

    this.beforeUnloadHandler = () => {
      persistClicks(this.pendingCount);
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    if (this.pendingCount > 0) {
      this.scheduleFlush();
    }
  }

  enqueue(): boolean {
    if (this.isDisposed) return false;

    if (this.pendingCount >= MAX_PENDING_CLICKS) {
      this.onOverflow?.();
      return false;
    }

    this.pendingCount++;
    this.scheduleFlush();
    return true;
  }

  setOnSuccess(callback: (result: ClicksResult) => void): void {
    this.onSuccess = callback;
  }

  setOnError(callback: () => void): void {
    this.onError = callback;
  }

  setOnOverflow(callback: () => void): void {
    this.onOverflow = callback;
  }

  getPendingCount(): number {
    return this.pendingCount;
  }

  getMaxPendingClicks(): number {
    return MAX_PENDING_CLICKS;
  }

  async flush(): Promise<void> {
    if (this.pendingCount === 0 || this.isFlushing || this.isDisposed) return;

    this.isFlushing = true;
    const count = this.pendingCount;
    this.pendingCount = 0;
    this.clearScheduledFlush();

    try {
      const command = new AddClicksCommand(this.addClicks, count);
      const result = await command.execute();

      if (result) {
        this.consecutiveErrors = 0;
        this.onSuccess?.(result);
      } else {
        this.handleFlushError(count);
      }
    } catch {
      this.handleFlushError(count);
    } finally {
      this.isFlushing = false;
    }
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    this.clearScheduledFlush();

    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    if (this.pendingCount > 0) {
      persistClicks(this.pendingCount);
    }
  }

  private handleFlushError(count: number): void {
    if (this.isDisposed) {
      persistClicks(count);
      return;
    }

    this.pendingCount = Math.min(this.pendingCount + count, MAX_PENDING_CLICKS);
    this.consecutiveErrors++;
    this.onError?.();

    const delay = Math.min(
      BASE_RETRY_DELAY_MS * Math.pow(2, this.consecutiveErrors - 1),
      MAX_RETRY_DELAY_MS
    );
    this.flushTimeout = setTimeout(() => this.flush(), delay);
  }

  private scheduleFlush(): void {
    if (this.flushTimeout || this.isFlushing) return;
    this.flushTimeout = setTimeout(() => this.flush(), this.batchDelayMs);
  }

  private clearScheduledFlush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}
