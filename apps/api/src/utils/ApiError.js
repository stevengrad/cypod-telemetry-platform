// cypod-telemetry
export class ApiError extends Error {
  constructor(status, code, messageKey, meta = undefined) {
    super(messageKey);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.messageKey = messageKey;
    this.meta = meta;
  }
}
