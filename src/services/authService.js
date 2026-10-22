import * as userRepository from '../repositories/userRepository.js';
import { createSessionToken } from '../utils/authToken.js';
import { toWibIsoString } from '../utils/dateTime.js';
import { createHttpError } from '../utils/httpError.js';

let bcrypt;
try {
  ({ default: bcrypt } = await import('bcryptjs'));
} catch (e) {
  bcrypt = {
    compare: async (plain, hash) => plain === hash,
  };
}

function toAuthUser(user) {
  return {
    id: user.id,
    nik: user.nik,
    name: user.name,
    username: user.username,
    store_code: user.store_code,
    role: 'sales',
    is_active: user.is_active,
    last_synced_at: toWibIsoString(user.last_synced_at),
  };
}

export async function login(username, password) {
  const user = await userRepository.findByUsername(username);

  if (!user) {
    console.warn(`[AUTH] Login gagal: User "${username}" tidak ditemukan di tabel users.`);
    throw createHttpError(401, 'UNAUTHORIZED', 'Kredensial tidak valid (Username atau password salah)');
  }

  if (!user.is_active) {
    console.warn(`[AUTH] Login gagal: Akun "${username}" berstatus non-aktif (is_active = false).`);
    throw createHttpError(403, 'FORBIDDEN', 'Akun karyawan tidak aktif di sistem. Hubungi Administrator / HR.');
  }

  // Fallback plain text untuk password yang belum di-hash
  const isPasswordValid =
    (await bcrypt.compare(password, user.password)) ||
    password === user.password;

  if (!isPasswordValid) {
    console.warn(`[AUTH] Login gagal: Password untuk user "${username}" tidak cocok.`);
    throw createHttpError(401, 'UNAUTHORIZED', 'Kredensial tidak valid (Username atau password salah)');
  }

  const updatedUser = await userRepository.updateLastLogin(user.id);

  return {
    user: toAuthUser(updatedUser),
    token: createSessionToken(updatedUser.nik),
  };
}

export async function getProfile(nik) {
  const user = await userRepository.findByNik(nik);

  if (!user) {
    throw createHttpError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  return { user: toAuthUser(user) };
}
