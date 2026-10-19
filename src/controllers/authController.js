const authService = require('../services/authService');

const authController = {
  /**
   * Endpoint POST /api/eslip/v1/auth/login
   * Body: { "username": "aryan", "password": "password111" }
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body || {};

      if (!username || !password) {
        return res.status(422).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Username dan password wajib diisi!',
          data: null,
        });
      }

      const result = await authService.login(username, password);

      return res.status(200).json({
        success: true,
        code: 'OK',
        message: 'Login berhasil',
        data: result,
      });
    } catch (error) {
      // Jika error diketahui (misal 401 UNAUTHORIZED atau 403 FORBIDDEN dari HCM)
      if (error.statusCode && error.statusCode < 500) {
        return res.status(error.statusCode).json({
          success: false,
          code: error.code || 'UNAUTHORIZED',
          message: error.message || 'Login gagal',
          data: null,
        });
      }

      // Jika error sistem/server yang tidak terduga, serahkan ke errorHandler middleware
      next(error);
    }
  },
};

module.exports = authController;
