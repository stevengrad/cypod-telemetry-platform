// cypod-telemetry
import { Router } from 'express';
import { db, withTransaction } from '../db/mysql.js';
import { t } from '../i18n/messages.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { bulkDeviceSchema, deviceSchema } from '../validation/schemas.js';

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

function mapDevice(row) {
  const latest = row.telemetryId ? {
    id: String(row.telemetryId), deviceId: row.id, battery: Number(row.battery), temperature: Number(row.temperature),
    lat: Number(row.lat), lng: Number(row.lng), status: row.telemetryStatus,
    timestamp: new Date(row.recordedAt).toISOString(), receivedAt: new Date(row.receivedAt).toISOString(),
    trafficClass: row.trafficClass,
  } : null;
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    site: row.site,
    connectivity: row.connectivity,
    serialNumber: row.serialNumber,
    createdAt: new Date(row.createdAt).toISOString(),
    latest,
    activeAlertCount: Number(row.activeAlertCount || 0),
  };
}

async function assignOne(connection, user, input) {
  if (input.owner && input.owner.toLowerCase() !== user.email.toLowerCase()) {
    throw new ApiError(403, 'OWNER_MISMATCH', 'forbidden');
  }
  const [catalogRows] = await connection.query(
    `SELECT id, lifecycle_status AS lifecycleStatus, assigned_user_id AS assignedUserId
       FROM device_catalog WHERE id = ? AND inventory_user_id = ? FOR UPDATE`,
    [input.id, user.id],
  );
  const catalog = catalogRows[0];
  if (!catalog) throw new ApiError(404, 'DEVICE_NOT_IN_INVENTORY', 'deviceNotInInventory');
  if (catalog.lifecycleStatus !== 'AVAILABLE' || catalog.assignedUserId) {
    throw new ApiError(409, 'CATALOG_DEVICE_UNAVAILABLE', 'catalogDeviceUnavailable');
  }
  await connection.query('INSERT INTO devices (id, name, owner_id, catalog_id) VALUES (?, ?, ?, ?)', [input.id, input.name, user.id, input.id]);
  await connection.query(
    `UPDATE device_catalog SET lifecycle_status = 'ASSIGNED', assigned_user_id = ? WHERE id = ?`,
    [user.id, input.id],
  );
}

devicesRouter.post('/', asyncHandler(async (req, res) => {
  const input = deviceSchema.parse(req.body);
  await withTransaction((connection) => assignOne(connection, req.user, input));
  res.status(201).json({ message: t(req.locale, 'deviceCreated'), device: { id: input.id, name: input.name } });
}));

devicesRouter.post('/bulk', asyncHandler(async (req, res) => {
  const input = bulkDeviceSchema.parse(req.body);
  await withTransaction(async (connection) => {
    for (const device of input.devices) await assignOne(connection, req.user, device);
  });
  res.status(201).json({ message: t(req.locale, 'devicesCreated'), added: input.devices.length });
}));

devicesRouter.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT d.id, d.name, d.created_at AS createdAt,
            c.model, c.site, c.connectivity, c.serial_number AS serialNumber,
            te.id AS telemetryId, te.battery, te.temperature, te.lat, te.lng,
            te.status AS telemetryStatus, te.recorded_at AS recordedAt, te.received_at AS receivedAt,
            te.traffic_class AS trafficClass,
            (SELECT COUNT(*) FROM alerts a WHERE a.device_id = d.id AND a.active = 1) AS activeAlertCount
       FROM devices d
       JOIN device_catalog c ON c.id = d.catalog_id
       LEFT JOIN telemetry_events te ON te.id = d.latest_telemetry_id
      WHERE d.owner_id = ?
      ORDER BY d.created_at DESC, d.id`,
    [req.user.id],
  );
  res.json({ devices: rows.map(mapDevice) });
}));
