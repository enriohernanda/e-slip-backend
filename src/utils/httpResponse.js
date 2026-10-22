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
