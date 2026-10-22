import * as userRepository from '../repositories/userRepository.js';

/**
 * Middleware untuk memvalidasi token otentikasi pada request yang membutuhkan login.
 * Mengambil identitas user secara otoritatif dari database dan menempelkan ke req.user.
 */
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Akses ditolak: Token autentikasi tidak ditemukan',
        data: null,
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Akses ditolak: Token autentikasi tidak ditemukan',
        data: null,
      });
    }

    // Format token yang didukung:
    // 1. eslip-token-{nik}-{timestamp}
    // 2. hcm-mock-token-{nik}-{timestamp}
    // 3. dummy-token-{nik}-{timestamp}
    let nik = null;
    const prefixes = ['eslip-token-', 'hcm-mock-token-', 'dummy-token-'];
    for (const prefix of prefixes) {
      if (token.startsWith(prefix)) {
        const remaining = token.slice(prefix.length);
        const lastDashIndex = remaining.lastIndexOf('-');
        if (lastDashIndex !== -1) {
          nik = remaining.slice(0, lastDashIndex);
        } else {
          nik = remaining;
        }
        break;
      }
    }

    // Jika token tidak cocok dengan format yang dikenali
    if (!nik) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Token tidak valid atau format tidak dikenali',
        data: null,
      });
    }

    // Cari user secara otoritatif di database
    const user = await userRepository.findByNik(nik);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Pengguna token tidak ditemukan di sistem',
        data: null,
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akun sales tidak aktif. Hubungi administrator.',
        data: null,
      });
    }

    // Ekstrak 5 digit kode outlet untuk format nomor slip
    const rawCode = user.store_code || '10011';
    const numericMatch = rawCode.match(/\d+/);
    const outletId = numericMatch ? numericMatch[0].padStart(5, '0').slice(-5) : '10011';

    // Tempelkan user context ke request
    req.user = {
      id: user.id,
      nik: user.nik,
      name: user.name,
      username: user.username,
      store_code: user.store_code,
      outlet_id: outletId,
      token,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: error.message || 'Gagal memverifikasi token autentikasi',
      data: null,
    });
  }
}
