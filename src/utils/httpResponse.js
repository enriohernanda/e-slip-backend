// Amplop respons standar API: { success, code, message, data }

export function sendSuccess(res, statusCode, code, message, data) {
  return res.status(statusCode).json({
    success: true,
    code,
    message,
    data,
  });
}

export function sendError(res, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    data: null,
  });
}

/**
 * Penanganan error di controller: error klien (statusCode < 500) langsung dijawab dengan
 * fallback code/message milik endpoint; error lainnya diteruskan ke errorHandler.
 *
 * @param {Error} error
 * @param {Object} res
 * @param {Function} next
 * @param {{ code: string, message: string }} fallback
 */
export function handleControllerError(error, res, next, fallback) {
  if (error.statusCode && error.statusCode < 500) {
    return sendError(res, error.statusCode, error.code || fallback.code, error.message || fallback.message);
  }

  return next(error);
}
