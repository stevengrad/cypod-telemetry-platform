// cypod-telemetry
export function localeMiddleware(req, _res, next) {
  const header = String(req.header('accept-language') || '').toLowerCase();
  req.locale = header.startsWith('ar') ? 'ar' : 'en';
  next();
}
