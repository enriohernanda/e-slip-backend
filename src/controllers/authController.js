import * as authService from '../services/authService.js';
import { sendError, sendSuccess } from '../utils/httpResponse.js';

export async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return sendError(res, 422, 'VALIDATION_ERROR', 'Username dan password wajib diisi!');
  }

  const result = await authService.login(username, password);

  return sendSuccess(res, 200, 'OK', 'Login berhasil', result);
}

export async function getProfile(req, res) {
  const result = await authService.getProfile(req.user.nik);

  return sendSuccess(res, 200, 'OK', 'Profil pengguna berhasil diambil', result);
}
