// Error yang kode dan pesannya aman dikirim ke client
export class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function createHttpError(statusCode, code, message) {
  const error = new HttpError(statusCode, code, message);
  // Stack trace dimulai dari pemanggil, bukan dari helper ini
  Error.captureStackTrace(error, createHttpError);
  return error;
}
