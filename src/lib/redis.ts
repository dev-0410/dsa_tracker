import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
  redisErrorReported?: boolean;
};

export const isRedisConfigured = Boolean(process.env.REDIS_URL?.trim());

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  const client = new Redis(url, {
    commandTimeout: 1_500,
    connectTimeout: 1_500,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(attempt) {
      return attempt > 2 ? null : Math.min(attempt * 100, 500);
    },
  });

  // ioredis emits `error` events even when command errors are handled. Keeping
  // a listener prevents an unhandled event while avoiding noisy repeated logs.
  client.on('error', (error) => {
    if (process.env.NODE_ENV !== 'test' && !globalForRedis.redisErrorReported) {
      globalForRedis.redisErrorReported = true;
      console.warn('[redis] unavailable; using local fallbacks', error.message);
    }
  });

  client.on('ready', () => {
    globalForRedis.redisErrorReported = false;
  });

  return client;
}

/** Lazily creates the shared Redis client; returns null when Redis is optional. */
export function getRedis(): Redis | null {
  if (!isRedisConfigured) return null;
  try {
    globalForRedis.redis ??= createRedisClient() ?? undefined;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test' && !globalForRedis.redisErrorReported) {
      globalForRedis.redisErrorReported = true;
      console.warn('[redis] invalid configuration; using local fallback', error instanceof Error ? error.message : error);
    }
    return null;
  }
  return globalForRedis.redis ?? null;
}

export async function isRedisReady(): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    return (await client.ping()) === 'PONG';
  } catch {
    return false;
  }
}

/** Intended for graceful worker shutdown and isolated tests. */
export async function disconnectRedis(): Promise<void> {
  const client = globalForRedis.redis;
  globalForRedis.redis = undefined;
  globalForRedis.redisErrorReported = false;

  if (!client) return;
  if (client.status === 'wait' || client.status === 'end') {
    client.disconnect();
    return;
  }

  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
}
