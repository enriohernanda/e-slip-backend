import * as authService from '../services/authService.js';
import { handleControllerError, sendError, sendSuccess } from '../utils/httpResponse.js';

/**
 * Endpoint POST /api/eslip/v1/auth/login
 * Body: { "username": "aryan", "password": "password111" }
 */
export async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return sendError(res, 422, 'VALIDATION_ERROR', 'Username dan password wajib diisi!');
    }

    const result = await authService.login(username, password);

    return sendSuccess(res, 200, 'OK', 'Login berhasil', result);
  } catch (error) {
    // Error yang diketahui (misal 401 UNAUTHORIZED atau 403 FORBIDDEN) dijawab langsung,
    // error sistem/server yang tidak terduga diserahkan ke errorHandler middleware
    return handleControllerError(error, res, next, { code: 'UNAUTHORIZED', message: 'Login gagal' });
  }
}
