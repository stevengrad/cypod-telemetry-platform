// cypod-telemetry
import { createHash } from 'node:crypto';
import { redis } from '../cache/redis.js';
import { config } from '../config/index.js';
import { db, withTransaction } from '../db/mysql.js';
import {
  deriveAlertConditions,
  deriveTelemetryStatus,
} from './telemetryPolicy.js';
import { ApiError } from '../utils/ApiError.js';

function fingerprint(input) {
  const canonical = JSON.stringify({
    battery: input.battery,
    temperature: input.temperature,
    lat: input.lat,
    lng: input.lng,
    status: input.status,
    timestamp: new Date(input.timestamp).toISOString(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

function toIso(value) {
  return new Date(value).toISOString();
}

function mapTelemetry(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    deviceId: row.deviceId ?? row.device_id,
    battery: Number(row.battery),
    temperature: Number(row.temperature),
    lat: Number(row.lat),
    lng: Number(row.lng),
    status: row.status,
    timestamp: toIso(row.recordedAt ?? row.recorded_at),
    receivedAt: toIso(row.receivedAt ?? row.received_at),
    trafficClass: row.trafficClass ?? row.traffic_class,
  };
}

async function queryLatest(connection, deviceId) {
  const [rows] = await connection.query(
    `SELECT id, device_id AS deviceId, battery, temperature, lat, lng, status,
            recorded_at AS recordedAt, received_at AS receivedAt, traffic_class AS trafficClass
       FROM telemetry_events
      WHERE device_id = ?
      ORDER BY recorded_at DESC, id DESC
      LIMIT 1`,
    [deviceId],
  );
  return mapTelemetry(rows[0]);
}

async function synchronizeAlerts(connection, latest) {
  const conditions = deriveAlertConditions(latest);
  for (const [type, condition] of Object.entries(conditions)) {
    if (condition.active) {
      await connection.query(
        `INSERT INTO alerts
          (device_id, type, message_key, observed_value, threshold_value, source_telemetry_id, active, opened_at, resolved_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, NULL)
         ON DUPLICATE KEY UPDATE
           message_key = VALUES(message_key), observed_value = VALUES(observed_value), threshold_value = VALUES(threshold_value),
           source_telemetry_id = VALUES(source_telemetry_id),
           opened_at = IF(active = 0, VALUES(opened_at), opened_at), active = 1, resolved_at = NULL`,
        [latest.deviceId, type, condition.messageKey, condition.observed, condition.threshold, latest.id, latest.timestamp.slice(0, 23).replace('T', ' ')],
      );
    } else {
      await connection.query(
        `UPDATE alerts SET active = 0, resolved_at = UTC_TIMESTAMP(3)
          WHERE device_id = ? AND type = ? AND active = 1`,
        [latest.deviceId, type],
      );
    }
  }
}

export async function storeTelemetry(deviceId, input, trafficClass = 'LIVE') {
  const key = `latest:${deviceId}`;
  const outcome = await withTransaction(async (connection) => {
    const hash = fingerprint(input);
    const [existing] = await connection.query(
      'SELECT id FROM telemetry_events WHERE device_id = ? AND fingerprint = ? LIMIT 1',
      [deviceId, hash],
    );
    if (existing[0]) {
      return { duplicate: true, latest: await queryLatest(connection, deviceId), becameLatest: false };
    }

    const recordedAt = input.timestamp.slice(0, 23).replace('T', ' ');
    const [inserted] = await connection.query(
      `INSERT INTO telemetry_events
        (device_id, battery, temperature, lat, lng, status, recorded_at, fingerprint, traffic_class)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, input.battery, input.temperature, input.lat, input.lng, input.status, recordedAt, hash, trafficClass],
    );

    const telemetryId = inserted.insertId;
    const [updated] = await connection.query(
      `UPDATE devices
          SET latest_telemetry_id = ?, latest_recorded_at = ?
        WHERE id = ?
          AND (latest_recorded_at IS NULL OR latest_recorded_at < ? OR
               (latest_recorded_at = ? AND (latest_telemetry_id IS NULL OR latest_telemetry_id < ?)))`,
      [telemetryId, recordedAt, deviceId, recordedAt, recordedAt, telemetryId],
    );

    const latest = await queryLatest(connection, deviceId);
    const becameLatest = updated.affectedRows === 1;
    if (becameLatest && latest) await synchronizeAlerts(connection, latest);
    return { duplicate: false, latest, becameLatest };
  });

  if (outcome.latest && (outcome.becameLatest || outcome.duplicate)) {
    await redis.set(key, JSON.stringify(outcome.latest), { EX: config.CACHE_TTL_SECONDS });
  }
  return outcome;
}

// cypod-telemetry
export async function updateTelemetry(
  deviceId,
  telemetryId,
  input,
) {
  const normalizedInput = {
  ...input,
  status: deriveTelemetryStatus(input),
};
  const cacheKey = `latest:${deviceId}`;

  let outcome;

  try {
    outcome = await withTransaction(async (connection) => {
      const [existingRows] = await connection.query(
        `SELECT id
           FROM telemetry_events
          WHERE id = ?
            AND device_id = ?
          LIMIT 1
          FOR UPDATE`,
        [telemetryId, deviceId],
      );

      if (!existingRows[0]) {
        throw new ApiError(
          404,
          'TELEMETRY_NOT_FOUND',
          'telemetryNotFound',
        );
      }

      const hash = fingerprint(normalizedInput)

      const [duplicateRows] = await connection.query(
        `SELECT id
           FROM telemetry_events
          WHERE device_id = ?
            AND fingerprint = ?
            AND id <> ?
          LIMIT 1`,
        [deviceId, hash, telemetryId],
      );

      if (duplicateRows[0]) {
        throw new ApiError(
          409,
          'DUPLICATE_TELEMETRY',
          'duplicateTelemetry',
        );
      }

      const recordedAt = normalizedInput.timestamp
        .slice(0, 23)
        .replace('T', ' ');

      await connection.query(
        `UPDATE telemetry_events
            SET battery = ?,
                temperature = ?,
                lat = ?,
                lng = ?,
                status = ?,
                recorded_at = ?,
                fingerprint = ?
          WHERE id = ?
            AND device_id = ?`,
        [
         normalizedInput.battery,
         normalizedInput.temperature,
         normalizedInput.lat,
         normalizedInput.lng,
         normalizedInput.status,
          recordedAt,
          hash,
          telemetryId,
          deviceId,
        ],
      );

      /*
       * Editing a timestamp can change which reading is the latest,
       * so query the latest reading again instead of assuming that
       * the edited reading is still latest.
       */
      const latest = await queryLatest(connection, deviceId);

      await connection.query(
        `UPDATE devices
            SET latest_telemetry_id = ?,
                latest_recorded_at = ?
          WHERE id = ?`,
        [
          latest.id,
          latest.timestamp.slice(0, 23).replace('T', ' '),
          deviceId,
        ],
      );

      await synchronizeAlerts(connection, latest);

      const [updatedRows] = await connection.query(
        `SELECT id,
                device_id AS deviceId,
                battery,
                temperature,
                lat,
                lng,
                status,
                recorded_at AS recordedAt,
                received_at AS receivedAt,
                traffic_class AS trafficClass
           FROM telemetry_events
          WHERE id = ?
            AND device_id = ?
          LIMIT 1`,
        [telemetryId, deviceId],
      );

      return {
        telemetry: mapTelemetry(updatedRows[0]),
        latest,
      };
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new ApiError(
        409,
        'DUPLICATE_TELEMETRY',
        'duplicateTelemetry',
      );
    }

    throw error;
  }

  /*
   * The latest value is updated immediately.
   * We do not wait for the old Redis TTL to expire.
   */
  await redis.set(
    cacheKey,
    JSON.stringify(outcome.latest),
    {
      EX: config.CACHE_TTL_SECONDS,
    },
  );

  return outcome;
}

export async function getLatestTelemetry(deviceId, dependencies = { redis, db }) {
  const key = `latest:${deviceId}`;
  const cached = await dependencies.redis.get(key);
  if (cached) {
    try {
      console.info(`[CACHE] HIT device=${deviceId}`);
      return { source: 'HIT', data: JSON.parse(cached) };
    } catch {
      await dependencies.redis.del(key);
    }
  }

  console.info(`[CACHE] MISS device=${deviceId}`);
  const latest = await queryLatest(dependencies.db, deviceId);
  if (latest) await dependencies.redis.set(key, JSON.stringify(latest), { EX: config.CACHE_TTL_SECONDS });
  return { source: 'MISS', data: latest };
}

export async function importRowsForDevice(deviceId, rows) {
  const summary = { stored: 0, duplicates: 0 };
  for (const row of rows) {
    const result = await storeTelemetry(deviceId, row, 'BACKFILL');
    if (result.duplicate) summary.duplicates += 1;
    else summary.stored += 1;
  }
  return summary;
}

export function analyzeRows(rows, knownDeviceIds, validate) {
  const seen = new Set();
  const summary = { total: rows.length, stored: 0, duplicates: 0, rejected: 0, byCode: {} };
  for (const raw of rows) {
    if (!knownDeviceIds.has(raw.device_id)) {
      summary.rejected += 1;
      summary.byCode.UNKNOWN_DEVICE = (summary.byCode.UNKNOWN_DEVICE || 0) + 1;
      continue;
    }
    try {
      const value = validate(raw);
      const hash = `${raw.device_id}:${fingerprint(value)}`;
      if (seen.has(hash)) {
        summary.duplicates += 1;
      } else {
        seen.add(hash);
        summary.stored += 1;
      }
    } catch (error) {
      summary.rejected += 1;
      const code = error.code || 'VALIDATION_ERROR';
      summary.byCode[code] = (summary.byCode[code] || 0) + 1;
    }
  }
  return summary;
}
