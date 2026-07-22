// cypod-telemetry
import { redis } from '../cache/redis.js';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

function minuteBucket(date = new Date()) {
  return date.toISOString().slice(0, 16).replace(/[-:T]/g, '');
}

export function isBackfillTimestamp(timestamp, now = Date.now()) {
  return now - new Date(timestamp).getTime() >= config.BACKFILL_MIN_AGE_SECONDS * 1000;
}

async function consume(key, limit, ttlSeconds = 120) {
  const script = `
    local value = redis.call('INCR', KEYS[1])
    if value == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
    return value
  `;
  const value = Number(await redis.eval(script, { keys: [key], arguments: [String(ttlSeconds)] }));
  return { allowed: value <= limit, count: value, limit };
}

export async function enforceLiveRateLimit(deviceId) {
  const result = await consume(`rate:live:${deviceId}:${minuteBucket()}`, config.LIVE_RATE_LIMIT_PER_MINUTE);
  if (!result.allowed) {
    throw new ApiError(429, 'TELEMETRY_RATE_LIMITED', 'telemetryRateLimited', { limit: result.limit, windowSeconds: 60 });
  }
  return result;
}

export async function enforceBackfillRateLimit(deviceId) {
  const result = await consume(`rate:backfill:${deviceId}:${minuteBucket()}`, config.BACKFILL_BATCH_LIMIT_PER_MINUTE);
  if (!result.allowed) {
    throw new ApiError(429, 'BACKFILL_RATE_LIMITED', 'backfillRateLimited', { limit: result.limit, windowSeconds: 60 });
  }
  return result;
}

export function createMemoryQuota(limit) {
  let count = 0;
  return () => ({ allowed: ++count <= limit, count, limit });
}
