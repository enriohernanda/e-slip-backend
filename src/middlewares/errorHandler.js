// Middleware terpusat untuk menangani error di aplikasi Express
const errorHandler = (err, req, res, next) => {
  console.error('[Error Logger]:', err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const errorMessage = err.message || 'Terjadi kesalahan pada server';

  res.status(statusCode).json({
    success: false,
    code: errorCode,
    message: errorMessage,
    data: null,
  });
};

module.exports = errorHandler;
