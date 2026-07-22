// cypod-telemetry
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { analyzeRows } from '../services/telemetryService.js';
import { validateTelemetryPayload } from '../validation/schemas.js';

test('dirty sample policy remains stable: 519 stored, 1 duplicate, 9 rejected', async () => {
  const path = process.env.SAMPLE_FILE_PATH || new URL('../../../../sample_telemetry.json', import.meta.url);
  const rows = JSON.parse(await readFile(path, 'utf8'));
  const known = new Set(['DEV-1001', 'DEV-1002', 'DEV-1003', 'DEV-1004', 'DEV-1005']);
  const result = analyzeRows(rows, known, validateTelemetryPayload);
  assert.deepEqual(result, {
    total: 529,
    stored: 519,
    duplicates: 1,
    rejected: 9,
    byCode: {
      INVALID_BATTERY: 2,
      INVALID_STATUS: 1,
      INVALID_GPS: 1,
      INVALID_TEMPERATURE: 1,
      UNKNOWN_DEVICE: 4,
    },
  });
});
