// cypod-telemetry
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/index.js';
import { t } from './i18n/messages.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { localeMiddleware } from './middleware/locale.js';
import { alertsRouter } from './routes/alerts.js';
import { authRouter } from './routes/auth.js';
import { catalogRouter } from './routes/catalog.js';
import { devicesRouter } from './routes/devices.js';
import { telemetryRouter } from './routes/telemetry.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));
  app.use(localeMiddleware);
  app.get('/health', (req, res) => res.json({ status: 'ok', message: t(req.locale, 'healthOk') }));
  app.use('/auth', authRouter);
  app.use('/device-catalog', catalogRouter);
  app.use('/devices', devicesRouter);
  app.use('/devices', telemetryRouter);
  app.use('/alerts', alertsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
