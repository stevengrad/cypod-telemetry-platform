// cypod-telemetry
import { connectRedis } from './cache/redis.js';
import { config } from './config/index.js';
import { waitForMysql } from './db/mysql.js';
import { createApp } from './app.js';
import { seedDemo } from './scripts/seedDemo.js';

async function start() {
  await waitForMysql();
  await connectRedis();
  if (config.AUTO_SEED_DEMO) await seedDemo();
  const app = createApp();
  app.listen(config.PORT, () => console.info(`[API] listening on ${config.PORT}`));
}

start().catch((error) => {
  console.error('[STARTUP]', error?.message || error);
  process.exit(1);
});
