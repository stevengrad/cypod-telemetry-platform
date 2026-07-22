// cypod-telemetry
import assert from 'node:assert/strict';
import test from 'node:test';
import { getLatestTelemetry } from '../services/telemetryService.js';

test('latest telemetry misses once, repopulates cache, then returns a HIT', async () => {
  const state = new Map();
  let dbReads = 0;
  const fakeRedis = {
    get: async (key) => state.get(key) || null,
    set: async (key, value) => { state.set(key, value); },
    del: async (key) => state.delete(key),
  };
  const fakeDb = {
    query: async () => {
      dbReads += 1;
      return [[{
        id: 7, deviceId: 'DEV-1001', battery: 88, temperature: 29, lat: 30.1, lng: 31.2,
        status: 'OK', recordedAt: new Date('2026-07-10T10:00:00Z'), receivedAt: new Date('2026-07-10T10:00:01Z'), trafficClass: 'LIVE',
      }]];
    },
  };
  const first = await getLatestTelemetry('DEV-1001', { redis: fakeRedis, db: fakeDb });
  const second = await getLatestTelemetry('DEV-1001', { redis: fakeRedis, db: fakeDb });
  assert.equal(first.source, 'MISS');
  assert.equal(second.source, 'HIT');
  assert.equal(second.data.battery, 88);
  assert.equal(dbReads, 1);
});
