// cypod-telemetry
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { config } from '../config/index.js';
import { db, withTransaction } from '../db/mysql.js';
import { provisionInventory } from '../services/inventoryService.js';
import { storeTelemetry } from '../services/telemetryService.js';
import { validateTelemetryPayload } from '../validation/schemas.js';

export async function ensureDemoUserAndInventory() {
  const passwordHash = await bcrypt.hash(config.DEMO_PASSWORD, 12);
  const user = await withTransaction(async (connection) => {
    await connection.query(
      `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)`,
      ['Director Demo', config.DEMO_EMAIL.toLowerCase(), passwordHash],
    );
    const [rows] = await connection.query('SELECT id, name, email FROM users WHERE email = ? LIMIT 1', [config.DEMO_EMAIL.toLowerCase()]);
    const found = rows[0];
    await provisionInventory(connection, found.id, 300, true);
    for (let index = 1; index <= 5; index += 1) {
      const id = `DEV-100${index}`;
      await connection.query(
        'INSERT IGNORE INTO devices (id, name, owner_id, catalog_id) VALUES (?, ?, ?, ?)',
        [id, `Field Sensor ${index}`, found.id, id],
      );
      await connection.query(
        `UPDATE device_catalog SET lifecycle_status = 'ASSIGNED', assigned_user_id = ? WHERE id = ?`,
        [found.id, id],
      );
    }
    return found;
  });
  return user;
}

export async function importSampleFile(filePath = config.SAMPLE_FILE_PATH, { skipWhenPopulated = false } = {}) {
  const demoUser = await ensureDemoUserAndInventory();
  if (skipWhenPopulated) {
    const [[countRow]] = await db.query(
      `SELECT COUNT(*) AS count FROM telemetry_events te
       JOIN devices d ON d.id = te.device_id WHERE d.owner_id = ?`,
      [demoUser.id],
    );
    if (Number(countRow.count) >= 519) return { skipped: true, reason: 'already populated' };
  }

  const rows = JSON.parse(await readFile(filePath, 'utf8'));
  const summary = { total: rows.length, stored: 0, duplicates: 0, rejected: 0, byCode: {} };
  const knownDevices = new Set(['DEV-1001', 'DEV-1002', 'DEV-1003', 'DEV-1004', 'DEV-1005']);

  for (const raw of rows) {
    if (!knownDevices.has(raw.device_id)) {
      summary.rejected += 1;
      summary.byCode.UNKNOWN_DEVICE = (summary.byCode.UNKNOWN_DEVICE || 0) + 1;
      continue;
    }
    try {
      // note: received_at is deliberately not copied; receipt time is owned by the server.
      const input = validateTelemetryPayload(raw);
      const result = await storeTelemetry(raw.device_id, input, 'BACKFILL');
      if (result.duplicate) summary.duplicates += 1;
      else summary.stored += 1;
    } catch (error) {
      summary.rejected += 1;
      const code = error.code || 'VALIDATION_ERROR';
      summary.byCode[code] = (summary.byCode[code] || 0) + 1;
    }
  }
  return { skipped: false, demo: { email: config.DEMO_EMAIL, password: config.DEMO_PASSWORD }, summary };
}

export async function seedDemo() {
  const result = await importSampleFile(config.SAMPLE_FILE_PATH, { skipWhenPopulated: true });
  console.info('[SEED]', JSON.stringify(result));
  return result;
}
