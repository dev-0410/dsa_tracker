import { createHash } from 'node:crypto';

import { getRedis } from '@/lib/redis';

export interface RateLimitOptions {
  limit: number;
  namespace?: string;
  windowMs: number;
}

export interface RateLimitResult {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
  source: 'memory' | 'redis';
  success: boolean;
}

interface MemoryWindow {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  rateLimitMemory?: Map<string, MemoryWindow>;
  rateLimitOperations?: number;
};

const memoryWindows = globalForRateLimit.rateLimitMemory ?? new Map<string, MemoryWindow>();
globalForRateLimit.rateLimitMemory = memoryWindows;

const MAX_MEMORY_KEYS = 10_000;
const REDIS_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`;

function validateOptions(options: RateLimitOptions): void {
  if (!Number.isSafeInteger(options.limit) || options.limit < 1) {
    throw new TypeError('Rate-limit limit must be a positive integer.');
  }
  if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1) {
    throw new TypeError('Rate-limit windowMs must be a positive integer.');
  }
}

function rateLimitKey(identifier: string, namespace = 'api'): string {
  const safeNamespace = namespace.replace(/[^A-Za-z0-9:_-]/g, '_').slice(0, 48) || 'api';
  const digest = createHash('sha256').update(identifier).digest('base64url');
  return `rate:${safeNamespace}:${digest}`;
}

function result(
  count: number,
  resetAt: number,
  source: RateLimitResult['source'],
  options: RateLimitOptions,
): RateLimitResult {
  const success = count <= options.limit;
  return {
    success,
    limit: options.limit,
    remaining: Math.max(0, options.limit - count),
    resetAt,
    retryAfterMs: success ? 0 : Math.max(0, resetAt - Date.now()),
    source,
  };
}

function pruneMemory(now: number): void {
  globalForRateLimit.rateLimitOperations = (globalForRateLimit.rateLimitOperations ?? 0) + 1;
  if (globalForRateLimit.rateLimitOperations % 100 !== 0 && memoryWindows.size < MAX_MEMORY_KEYS) {
    return;
  }

  for (const [key, value] of memoryWindows) {
    if (value.resetAt <= now) memoryWindows.delete(key);
  }

  while (memoryWindows.size >= MAX_MEMORY_KEYS) {
    const oldest = memoryWindows.keys().next().value as string | undefined;
    if (!oldest) break;
    memoryWindows.delete(oldest);
  }
}

function memoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  pruneMemory(now);

  const existing = memoryWindows.get(key);
  const current =
    !existing || existing.resetAt <= now
      ? { count: 1, resetAt: now + options.windowMs }
      : { count: existing.count + 1, resetAt: existing.resetAt };

  memoryWindows.set(key, current);
  return result(current.count, current.resetAt, 'memory', options);
}

/**
 * Atomic fixed-window limiting in Redis with a bounded in-process fallback.
 * The fallback preserves basic protection during local development/outages;
 * callers can inspect `source` for operational telemetry.
 */
export async function rateLimit(
  identifier: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  validateOptions(options);
  const key = rateLimitKey(identifier, options.namespace);
  const client = getRedis();

  if (client) {
    try {
      const raw = (await client.eval(REDIS_SCRIPT, 1, key, options.windowMs)) as [number, number];
      const count = Number(raw[0]);
      const ttl = Number(raw[1]);
      if (Number.isFinite(count) && Number.isFinite(ttl)) {
        return result(count, Date.now() + Math.max(ttl, 0), 'redis', options);
      }
    } catch {
      // Continue through the bounded local limiter when Redis is unavailable.
    }
  }

  return memoryRateLimit(key, options);
}

export const checkRateLimit = rateLimit;

export function rateLimitHeaders(value: RateLimitResult): Record<string, string> {
  return {
    'ratelimit-limit': String(value.limit),
    'ratelimit-remaining': String(value.remaining),
    'ratelimit-reset': String(Math.ceil(value.resetAt / 1_000)),
    ...(value.success
      ? {}
      : { 'retry-after': String(Math.max(1, Math.ceil(value.retryAfterMs / 1_000))) }),
  };
}
