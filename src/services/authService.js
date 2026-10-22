import * as userRepository from '../repositories/userRepository.js';
import { createSessionToken } from '../utils/authToken.js';
import { createHttpError } from '../utils/httpError.js';

let bcrypt;
try {
  ({ default: bcrypt } = await import('bcryptjs'));
} catch (e) {
  bcrypt = {
    compare: async (plain, hash) => plain === hash,
  };
}

// Data user yang aman dikirim ke frontend (tanpa hash password); dipakai login dan profil
function toAuthUser(user) {
  return {
    id: user.id,
    nik: user.nik,
    name: user.name,
    username: user.username,
    store_code: user.store_code,
    role: 'sales',
    is_active: user.is_active,
    last_synced_at: user.last_synced_at,
  };
}

/**
 * Menangani alur login menggunakan database PostgreSQL:
 * 1. Cari user di database berdasarkan username
 * 2. Periksa status keaktifan user
 * 3. Verifikasi password menggunakan bcrypt
 * 4. Perbarui timestamp login terakhir
 * 5. Kembalikan data user dan token untuk sesi frontend
 */
export async function login(username, password) {
  // 1. Cari user dari database PostgreSQL
  const user = await userRepository.findByUsername(username);

  if (!user) {
    console.warn(`[AUTH] Login gagal: User "${username}" tidak ditemukan di tabel users.`);
    throw createHttpError(401, 'UNAUTHORIZED', 'Kredensial tidak valid (Username atau password salah)');
  }

  // 2. Cek apakah akun aktif
  if (!user.is_active) {
    console.warn(`[AUTH] Login gagal: Akun "${username}" berstatus non-aktif (is_active = false).`);
    throw createHttpError(403, 'FORBIDDEN', 'Akun karyawan tidak aktif di sistem. Hubungi Administrator / HR.');
  }

  // 3. Verifikasi kecocokan password (bcrypt hash dengan fallback plain text)
  const isPasswordValid =
    (await bcrypt.compare(password, user.password)) ||
    password === user.password;

  if (!isPasswordValid) {
    console.warn(`[AUTH] Login gagal: Password untuk user "${username}" tidak cocok.`);
    throw createHttpError(401, 'UNAUTHORIZED', 'Kredensial tidak valid (Username atau password salah)');
  }

  // 4. Update waktu login terakhir di database
  const updatedUser = await userRepository.updateLastLogin(user.id);

  // 5. Kembalikan data user yang bersih (tanpa hash password)
  return {
    user: toAuthUser(updatedUser),
    token: createSessionToken(updatedUser.nik),
  };
}

/**
 * Mengambil profil user yang sedang login (dipakai frontend untuk memulihkan sesi).
 *
 * @param {string} nik - NIK dari token yang sudah diverifikasi authMiddleware
 */
export async function getProfile(nik) {
  const user = await userRepository.findByNik(nik);

  if (!user) {
    throw createHttpError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  return { user: toAuthUser(user) };
}
