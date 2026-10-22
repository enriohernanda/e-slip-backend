import { HttpError } from '../utils/httpError.js';
import { sendError } from '../utils/httpResponse.js';

// Error dari express.json (body-parser), dikenali dari err.type
const REQUEST_BODY_ERRORS = {
  400: { code: 'BAD_REQUEST', message: 'Request body bukan JSON yang valid' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'Ukuran request body melebihi batas' },
  415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Encoding request body tidak didukung' },
};

// `next` wajib ada: Express mengenali error handler dari 4 parameternya
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    if (err.statusCode >= 500) console.error('[Error Logger]:', err);
    return sendError(res, err.statusCode, err.code, err.message);
  }

  const requestBodyError = err.type && REQUEST_BODY_ERRORS[err.status];
  if (requestBodyError) {
    return sendError(res, err.status, requestBodyError.code, requestBodyError.message);
  }

  console.error('[Error Logger]:', err);
  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Terjadi kesalahan pada server');
}
