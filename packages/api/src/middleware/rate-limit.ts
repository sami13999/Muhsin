/**
 * Rate Limiting Middleware — ADR-034 compliant.
 *
 * Sliding window counter rate limiting using Upstash Redis.
 * Falls back to in-memory rate limiting when Redis is unavailable.
 *
 * Key: {workspace_id}:{window_start}
 * Algorithm: Sliding window counter with fixed windows
 *
 * Feature flag: RATE_LIMIT_ENABLED (default: true, set false to disable)
 */
import type { Context, Next } from 'hono';
import { RateLimitError } from '@mushin/shared';

// ── Configuration ──────────────────────────────────────────────

export interface RateLimitConfig {
  /** Window size in milliseconds (default: 60000 = 1 minute) */
  windowMs: number;
  /** Maximum requests per window (default: 100) */
  maxRequests: number;
  /** Key prefix for Redis (default: 'rl') */
  keyPrefix: string;
  /** Feature flag: disable rate limiting entirely */
  enabled: boolean;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 100,
  keyPrefix: 'rl',
  enabled: true,
};

// ── Upstash Redis Client (lazy init) ───────────────────────────

let _redis: any = null;
let _redisAvailable: boolean | null = null;
let _lastRedisAttempt: number = 0;
const REDIS_RETRY_INTERVAL_MS = 60_000; // Retry Redis connection every 60s

async function getRedis(): Promise<any | null> {
  if (_redis) return _redis;

  // If previously failed, only retry after RETRY_INTERVAL
  if (_redisAvailable === false) {
    const now = Date.now();
    if (now - _lastRedisAttempt < REDIS_RETRY_INTERVAL_MS) return null;
  }

  _lastRedisAttempt = Date.now();

  try {
    const url = process.env['UPSTASH_REDIS_REST_URL'];
    const token = process.env['UPSTASH_REDIS_REST_TOKEN'];

    if (!url || !token) {
      _redisAvailable = false;
      return null;
    }

    const { Redis } = await import('@upstash/redis');
    _redis = new Redis({ url, token });

    // Test connectivity
    await _redis.ping();
    _redisAvailable = true;
    return _redis;
  } catch {
    _redisAvailable = false;
    _redis = null; // Reset so we retry next time
    return null;
  }
}

// ── In-Memory Fallback ─────────────────────────────────────────

interface WindowCounter {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, WindowCounter>();

function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupMemoryStore, 5 * 60 * 1000);

// ── Rate Limit Check ───────────────────────────────────────────

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const redis = await getRedis();
  if (!redis) {
    return checkRateLimitMemory(key, config);
  }

  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const redisKey = `${config.keyPrefix}:${key}:${windowStart}`;

  try {
    // Sliding window counter using INCR + EXPIRE
    const count = await redis.incr(redisKey);
    if (count === 1) {
      // First request in this window — set expiry
      await redis.expire(redisKey, Math.ceil(config.windowMs / 1000));
    }

    const remaining = Math.max(0, config.maxRequests - count);
    const resetAt = windowStart + config.windowMs;

    return {
      allowed: count <= config.maxRequests,
      limit: config.maxRequests,
      remaining,
      resetAt,
    };
  } catch {
    // Redis error — fall back to memory
    return checkRateLimitMemory(key, config);
  }
}

function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const windowKey = `${key}:${windowStart}`;

  const existing = memoryStore.get(windowKey);
  const count = (existing?.count ?? 0) + 1;

  memoryStore.set(windowKey, {
    count,
    resetAt: windowStart + config.windowMs,
  });

  const remaining = Math.max(0, config.maxRequests - count);
  const resetAt = windowStart + config.windowMs;

  return {
    allowed: count <= config.maxRequests,
    limit: config.maxRequests,
    remaining,
    resetAt,
  };
}

// ── Middleware Factory ──────────────────────────────────────────

export function rateLimitMiddleware(config?: Partial<RateLimitConfig>) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  return async (c: Context, next: Next) => {
    // Feature flag check
    if (!mergedConfig.enabled || process.env['RATE_LIMIT_ENABLED'] === 'false') {
      return next();
    }

    // Derive key from workspace ID
    const tenancy = c.get('tenancy');
    const workspaceId = tenancy?.workspaceId ?? 'anonymous';
    const key = workspaceId;

    // Check rate limit
    const result = await checkRateLimitRedis(key, mergedConfig);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(result.limit));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new RateLimitError(retryAfterSeconds);
    }

    return next();
  };
}

// ── Exported utilities for testing ──────────────────────────────

export function resetRateLimitState() {
  memoryStore.clear();
  _redis = null;
  _redisAvailable = null;
}

export function getRateLimitMetrics() {
  return {
    memoryStoreSize: memoryStore.size,
    redisAvailable: _redisAvailable,
  };
}
