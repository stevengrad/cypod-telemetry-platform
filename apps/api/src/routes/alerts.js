// cypod-telemetry
import { Router } from 'express';
import { db } from '../db/mysql.js';
import { t } from '../i18n/messages.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

alertsRouter.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT a.id, a.device_id AS deviceId, d.name AS deviceName, a.type, a.message_key AS messageKey,
            a.observed_value AS observedValue, a.threshold_value AS thresholdValue,
            a.opened_at AS openedAt, a.updated_at AS updatedAt
       FROM alerts a JOIN devices d ON d.id = a.device_id
      WHERE d.owner_id = ? AND a.active = 1
      ORDER BY a.opened_at DESC, a.id DESC`,
    [req.user.id],
  );
  res.json({ alerts: rows.map((row) => ({
    id: String(row.id), deviceId: row.deviceId, deviceName: row.deviceName, type: row.type,
    message: t(req.locale, row.messageKey), observedValue: row.observedValue === null ? null : Number(row.observedValue),
    thresholdValue: row.thresholdValue === null ? null : Number(row.thresholdValue),
    triggeredAt: new Date(row.openedAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString(),
  })) });
}));
