// cypod-telemetry
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_DATABASE: z.string().default('telemetry'),
  MYSQL_USER: z.string().default('telemetry'),
  MYSQL_PASSWORD: z.string().default('telemetry'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16).default('development-secret-change-before-production'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(30),
  TEMP_CEILING: z.coerce.number().min(-40).max(120).default(45),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  AUTO_SEED_DEMO: z.string().default('true'),
  DEMO_EMAIL: z.string().email().default('director.demo@cypod.local'),
  DEMO_PASSWORD: z.string().min(8).default('DirectorDemo#2026'),
  SAMPLE_FILE_PATH: z.string().default('/app/sample_telemetry.json'),
});

const parsed = envSchema.parse(process.env);
export const TEMP_CEILING_TLM7 = parsed.TEMP_CEILING;

export const config = {
  ...parsed,
  TEMP_CEILING_TLM7,
  AUTO_SEED_DEMO: parsed.AUTO_SEED_DEMO.toLowerCase() === 'true',
  LIVE_RATE_LIMIT_PER_MINUTE: 10,
  BACKFILL_BATCH_LIMIT_PER_MINUTE: 2,
  BACKFILL_MAX_BATCH_SIZE: 500,
  BACKFILL_MIN_AGE_SECONDS: 120,
  MAX_FUTURE_SKEW_MINUTES: 5,
  INVENTORY_PAGE_MAX: 50,
};
