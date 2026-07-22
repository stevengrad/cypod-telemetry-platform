// cypod-telemetry
import { Router } from 'express';
import { config } from '../config/index.js';
import { db } from '../db/mysql.js';
import { t } from '../i18n/messages.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOwnedDevice } from '../services/deviceAccess.js';
import { enforceBackfillRateLimit, enforceLiveRateLimit, isBackfillTimestamp } from '../services/rateLimiter.js';
import { getLatestTelemetry, storeTelemetry } from '../services/telemetryService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { historyQuerySchema, validateTelemetryPayload } from '../validation/schemas.js';

export const telemetryRouter = Router();
telemetryRouter.use(requireAuth);

telemetryRouter.post('/:id/telemetry', asyncHandler(async (req, res) => {
  await requireOwnedDevice(req.user.id, req.params.id);
  const input = validateTelemetryPayload(req.body);
  if (req.header('x-telemetry-backfill') === 'true') {
    throw new ApiError(400, 'USE_BACKFILL_BATCH', 'backfillRequired');
  }
  await enforceLiveRateLimit(req.params.id);
  const result = await storeTelemetry(req.params.id, input, 'LIVE');
  res.status(result.duplicate ? 200 : 201).json({
    message: t(req.locale, result.duplicate ? 'duplicateIgnored' : 'telemetryStored'),
    duplicate: result.duplicate,
    latest: result.latest,
  });
}));

telemetryRouter.post('/:id/telemetry/batch', asyncHandler(async (req, res) => {
  await requireOwnedDevice(req.user.id, req.params.id);
  const readings = Array.isArray(req.body?.readings) ? req.body.readings : null;
  if (!readings || readings.length === 0) throw new ApiError(422, 'INVALID_BATCH', 'payloadInvalid');
  if (readings.length > config.BACKFILL_MAX_BATCH_SIZE) {
    throw new ApiError(413, 'BATCH_TOO_LARGE', 'batchTooLarge', { max: config.BACKFILL_MAX_BATCH_SIZE });
  }
  await enforceBackfillRateLimit(req.params.id);
  const summary = { total: readings.length, stored: 0, duplicates: 0, rejected: 0, errors: [] };
  for (let index = 0; index < readings.length; index += 1) {
    try {
      const reading = validateTelemetryPayload(readings[index]);
      if (!isBackfillTimestamp(reading.timestamp)) {
        throw new ApiError(422, 'INVALID_BACKFILL', 'invalidBackfill', { minimumAgeSeconds: config.BACKFILL_MIN_AGE_SECONDS });
      }
      const result = await storeTelemetry(req.params.id, reading, 'BACKFILL');
      if (result.duplicate) summary.duplicates += 1;
      else summary.stored += 1;
    } catch (error) {
      summary.rejected += 1;
      summary.errors.push({ index, code: error.code || 'VALIDATION_ERROR', message: t(req.locale, error.messageKey || 'payloadInvalid') });
    }
  }
  res.status(summary.rejected ? 207 : 201).json({ message: t(req.locale, 'telemetryStored'), summary });
}));

telemetryRouter.get('/:id/latest', asyncHandler(async (req, res) => {
  await requireOwnedDevice(req.user.id, req.params.id);
  const result = await getLatestTelemetry(req.params.id);
  res.json(result);
}));

telemetryRouter.get('/:id/history', asyncHandler(async (req, res) => {
  await requireOwnedDevice(req.user.id, req.params.id);
  const query = historyQuerySchema.parse(req.query);
  if (query.from && query.to && new Date(query.from) > new Date(query.to)) throw new ApiError(422, 'INVALID_DATE_RANGE', 'invalidDateRange');
  const offset = (query.page - 1) * query.limit;
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  const [rows] = await db.query(
    `SELECT id, device_id AS deviceId, battery, temperature, lat, lng, status,
            recorded_at AS recordedAt, received_at AS receivedAt, traffic_class AS trafficClass,
            COUNT(*) OVER() AS totalCount
       FROM telemetry_events
      WHERE device_id = ?
        AND (? IS NULL OR recorded_at >= ?)
        AND (? IS NULL OR recorded_at <= ?)
      ORDER BY recorded_at DESC, id DESC
      LIMIT ? OFFSET ?`,
    [req.params.id, from, from, to, to, query.limit, offset],
  );
  const total = rows.length ? Number(rows[0].totalCount) : 0;
  res.json({
    data: rows.map(({ totalCount, ...row }) => ({
      id: String(row.id), deviceId: row.deviceId, battery: Number(row.battery), temperature: Number(row.temperature),
      lat: Number(row.lat), lng: Number(row.lng), status: row.status,
      timestamp: new Date(row.recordedAt).toISOString(), receivedAt: new Date(row.receivedAt).toISOString(), trafficClass: row.trafficClass,
    })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  });
}));
