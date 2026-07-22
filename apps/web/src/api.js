// cypod-telemetry
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiClientError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('accept-language', options.language || 'en');
  if (options.body) headers.set('content-type', 'application/json');
  if (options.token) headers.set('authorization', `Bearer ${options.token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiClientError(response.status, payload?.error?.code || 'REQUEST_FAILED', payload?.error?.message || '');
  }
  return payload;
}
