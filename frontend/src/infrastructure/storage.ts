export interface Storage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
}

export const createLocalStorage = (): Storage => ({
  get<T>(key: string): T | null {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  },
  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  },
});

export const createSafeStorage = (storage: Storage): Storage => ({
  get<T>(key: string): T | null {
    try {
      return storage.get<T>(key);
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      storage.set(key, value);
    } catch {
      alert('Storage unavailable');
    }
  },
});

export const storage = createSafeStorage(createLocalStorage());

