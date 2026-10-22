import * as userRepository from '../repositories/userRepository.js';
import { extractNikFromToken } from '../utils/authToken.js';
import { sendError } from '../utils/httpResponse.js';

// Ekstrak 5 digit kode outlet dari store_code untuk format nomor slip
function toOutletId(storeCode) {
  const rawCode = storeCode || '10011';
  const numericMatch = rawCode.match(/\d+/);
  return numericMatch ? numericMatch[0].padStart(5, '0').slice(-5) : '10011';
}

/**
 * Middleware untuk memvalidasi token otentikasi pada request yang membutuhkan login.
 * Mengambil identitas user secara otoritatif dari database dan menempelkan ke req.user.
 */
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Akses ditolak: Token autentikasi tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Akses ditolak: Token autentikasi tidak ditemukan');
    }

    const nik = extractNikFromToken(token);

    // Jika token tidak cocok dengan format yang dikenali
    if (!nik) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Token tidak valid atau format tidak dikenali');
    }

    // Cari user secara otoritatif di database
    const user = await userRepository.findByNik(nik);
    if (!user) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Pengguna token tidak ditemukan di sistem');
    }

    if (!user.is_active) {
      return sendError(res, 403, 'FORBIDDEN', 'Akun sales tidak aktif. Hubungi administrator.');
    }

    // Tempelkan user context ke request
    req.user = {
      id: user.id,
      nik: user.nik,
      name: user.name,
      username: user.username,
      store_code: user.store_code,
      outlet_id: toOutletId(user.store_code),
      token,
    };

    return next();
  } catch (error) {
    return sendError(res, 401, 'UNAUTHORIZED', error.message || 'Gagal memverifikasi token autentikasi');
  }
}
