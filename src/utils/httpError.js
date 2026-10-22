/**
 * Membuat Error dengan statusCode dan code untuk diterjemahkan menjadi respons HTTP
 * oleh controller atau errorHandler.
 *
 * @param {number} statusCode
 * @param {string} code
 * @param {string} message
 * @returns {Error}
 */
export function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  // Stack trace dimulai dari pemanggil, bukan dari helper ini
  Error.captureStackTrace(error, createHttpError);
  return error;
}
