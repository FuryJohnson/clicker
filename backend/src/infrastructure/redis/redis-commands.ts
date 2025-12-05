import Redis from 'ioredis';

const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local max_requests = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])

local current = redis.call('INCR', key)

if current == 1 then
  redis.call('PEXPIRE', key, window_ms)
end

if current > max_requests then
  return 0
end

return 1
`;

const LOCK_SCRIPT = `
local lock_key = KEYS[1]
local lock_ttl = tonumber(ARGV[1])

if redis.call('SET', lock_key, '1', 'NX', 'PX', lock_ttl) then
  return 1
end
return 0
`;

export interface ExtendedRedis extends Redis {
  rateLimit(key: string, maxRequests: number, windowMs: number): Promise<number>;
  acquireLock(key: string, ttlMs: number): Promise<number>;
}

export function createExtendedRedis(redis: Redis): ExtendedRedis {
  redis.defineCommand('rateLimit', {
    numberOfKeys: 1,
    lua: RATE_LIMIT_SCRIPT,
  });

  redis.defineCommand('acquireLock', {
    numberOfKeys: 1,
    lua: LOCK_SCRIPT,
  });

  return redis as ExtendedRedis;
}

