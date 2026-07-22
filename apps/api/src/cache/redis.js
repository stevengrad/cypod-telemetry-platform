// cypod-telemetry
import { createClient } from 'redis';
import { config } from '../config/index.js';

export const redis = createClient({ url: config.REDIS_URL });
redis.on('error', (error) => console.error('[REDIS]', error.message));

export async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
}
