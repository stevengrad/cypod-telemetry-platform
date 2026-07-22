// cypod-telemetry
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

export function requireAuth(req, _res, next) {
  const authorization = req.header('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return next(new ApiError(401, 'UNAUTHORIZED', 'unauthorized'));
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    if (!payload || typeof payload !== 'object' || !payload.id) throw new Error('invalid token');
    req.user = { id: Number(payload.id), email: String(payload.email), name: String(payload.name || '') };
    next();
  } catch {
    next(new ApiError(401, 'UNAUTHORIZED', 'unauthorized'));
  }
}
