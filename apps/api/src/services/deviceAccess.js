// cypod-telemetry
import { db } from '../db/mysql.js';
import { ApiError } from '../utils/ApiError.js';

export async function requireOwnedDevice(userId, deviceId, connection = db) {
  const [rows] = await connection.query('SELECT id, name, owner_id AS ownerId FROM devices WHERE id = ? LIMIT 1', [deviceId]);
  const device = rows[0];
  if (!device) throw new ApiError(404, 'DEVICE_NOT_FOUND', 'notFound');
  if (Number(device.ownerId) !== Number(userId)) throw new ApiError(403, 'FORBIDDEN', 'forbidden');
  return device;
}
