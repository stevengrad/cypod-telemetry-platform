// cypod-telemetry
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryQuota, isBackfillTimestamp } from '../services/rateLimiter.js';

test('the 11th live reading is blocked while an old buffered batch remains eligible', () => {
  const consumeLive = createMemoryQuota(10);
  const liveResults = Array.from({ length: 11 }, () => consumeLive());
  assert.equal(liveResults.slice(0, 10).every((item) => item.allowed), true);
  assert.equal(liveResults[10].allowed, false);
  assert.equal(isBackfillTimestamp(new Date(Date.now() - 10 * 60_000).toISOString()), true);
  assert.equal(isBackfillTimestamp(new Date(Date.now() - 10_000).toISOString()), false);
});
