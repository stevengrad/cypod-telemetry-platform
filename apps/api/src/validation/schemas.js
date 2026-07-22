// cypod-telemetry
import { z } from 'zod';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

export const deviceSchema = z.object({
  id: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/),
  name: z.string().trim().min(2).max(120),
  owner: z.string().trim().email().optional(),
}).strict();

export const bulkDeviceSchema = z.object({
  devices: z.array(deviceSchema.pick({ id: true, name: true })).min(1).max(20),
}).strict();

export const catalogQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  site: z.string().trim().max(100).default(''),
  model: z.string().trim().max(80).default(''),
  connectivity: z.enum(['', 'CELLULAR', 'WIFI', 'LORA', 'ETHERNET']).default(''),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'ALL']).default('AVAILABLE'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(config.INVENTORY_PAGE_MAX).default(20),
});

export const historyQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function numericValue(value) {
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return value;
}

export function validateTelemetryPayload(raw) {
  const payload = {
    battery: numericValue(raw?.battery),
    temperature: numericValue(raw?.temperature),
    lat: numericValue(raw?.lat),
    lng: numericValue(raw?.lng),
    status: raw?.status,
    timestamp: raw?.timestamp,
  };
  if (typeof payload.battery !== 'number' || !Number.isFinite(payload.battery) || payload.battery < 0 || payload.battery > 100) {
    throw new ApiError(422, 'INVALID_BATTERY', 'batteryInvalid', { field: 'battery' });
  }
  if (typeof payload.temperature !== 'number' || !Number.isFinite(payload.temperature) || payload.temperature < -50 || payload.temperature > 100) {
    throw new ApiError(422, 'INVALID_TEMPERATURE', 'temperatureInvalid', { field: 'temperature' });
  }
  if (typeof payload.lat !== 'number' || !Number.isFinite(payload.lat) || payload.lat < -90 || payload.lat > 90 ||
      typeof payload.lng !== 'number' || !Number.isFinite(payload.lng) || payload.lng < -180 || payload.lng > 180) {
    throw new ApiError(422, 'INVALID_GPS', 'gpsInvalid', { field: 'lat,lng' });
  }
  if (!['OK', 'WARN', 'FAULT', 'OFFLINE'].includes(payload.status)) {
    throw new ApiError(422, 'INVALID_STATUS', 'statusInvalid', { field: 'status' });
  }
  const time = new Date(payload.timestamp);
  if (typeof payload.timestamp !== 'string' || Number.isNaN(time.getTime()) || time.getTime() > Date.now() + config.MAX_FUTURE_SKEW_MINUTES * 60_000) {
    throw new ApiError(422, 'INVALID_TIMESTAMP', 'timestampInvalid', { field: 'timestamp' });
  }
  return { ...payload, timestamp: time.toISOString() };
}
