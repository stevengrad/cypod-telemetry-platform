// cypod-telemetry
import { ZodError } from 'zod';
import { t } from '../i18n/messages.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', 'routeNotFound'));
}

export function errorHandler(error, req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: t(req.locale, 'validationFailed'),
        fields: error.issues.map((issue) => ({ field: issue.path.join('.'), message: t(req.locale, issue.message) })),
      },
    });
  }
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: { code: error.code, message: t(req.locale, error.messageKey), ...(error.meta ? { meta: error.meta } : {}) } });
  }
  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: t(req.locale, 'deviceExists') } });
  }
  console.error('[API ERROR]', error?.message || error);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: t(req.locale, 'internalError') } });
}
