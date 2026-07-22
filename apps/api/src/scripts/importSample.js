// cypod-telemetry
import { connectRedis, redis } from '../cache/redis.js';
import { db, waitForMysql } from '../db/mysql.js';
import { importSampleFile } from './seedDemo.js';

const filePath = process.argv[2] || '/app/sample_telemetry.json';

try {
  await waitForMysql();
  await connectRedis();
  const result = await importSampleFile(filePath, { skipWhenPopulated: false });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  await Promise.allSettled([redis.quit(), db.end()]);
}
