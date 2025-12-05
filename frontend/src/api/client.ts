const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RATE_LIMIT_DELAY_MS = 100;

interface ApiOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  initData: string;
  retries?: number;
}

export interface UserData {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  clicks: number;
  photoUrl?: string;
}

export interface LeaderEntry {
  rank: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  clicks: number;
}

export interface LeaderboardData {
  leaders: LeaderEntry[];
}

export interface UserRankData {
  rank: number;
  clicks: number;
}

export interface ClickResult {
  clicks: number;
  buffered: number;
}

type Success<T> = { ok: true; data: T };
type Failure = { ok: false; error: string; retryable: boolean };
export type Result<T> = Success<T> | Failure;

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = <T>(error: string, retryable = false): Result<T> => ({ ok: false, error, retryable });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async <T>(
  endpoint: string,
  options: ApiOptions
): Promise<Result<T>> => {
  const { method = 'GET', body, initData, retries = 0 } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
    },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);

  if (!response) {
    if (retries < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * (retries + 1));
      return request(endpoint, { ...options, retries: retries + 1 });
    }
    return fail('Network error', true);
  }

  if (response.status === 429) {
    if (retries < MAX_RETRIES) {
      await sleep(RATE_LIMIT_DELAY_MS * (retries + 1));
      return request(endpoint, { ...options, retries: retries + 1 });
    }
    return fail('Too many requests', true);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const isServerError = response.status >= 500;
    
    if (isServerError && retries < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * (retries + 1));
      return request(endpoint, { ...options, retries: retries + 1 });
    }
    
    return fail(errorBody.error || 'Request failed', isServerError);
  }

  const data = await response.json().catch(() => null);
  if (!data) {
    return fail('Invalid response', false);
  }

  return ok(data as T);
};

export const api = {
  auth: (initData: string) => request<UserData>('/auth', { method: 'POST', initData }),

  getUser: (initData: string) => request<UserData>('/user', { initData }),

  getUserRank: (initData: string) => request<UserRankData>('/user/rank', { initData }),

  addClicks: (initData: string, count: number) =>
    request<ClickResult>('/click', { method: 'POST', body: { count }, initData }),

  getLeaderboard: (initData: string) => request<LeaderboardData>('/leaderboard', { initData }),
};
