let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = {
    compare: async (plain, hash) => plain === hash,
  };
}
const userRepository = require('../repositories/userRepository');

const authService = {
  /**
   * Menangani alur login menggunakan database PostgreSQL:
   * 1. Cari user di database berdasarkan username atau NIK
   * 2. Periksa status keaktifan user
   * 3. Verifikasi password menggunakan bcrypt
   * 4. Perbarui timestamp login terakhir
   * 5. Kembalikan data user dan token untuk sesi frontend
   */
  async login(username, password) {
    // 1. Cari user dari database PostgreSQL
    const user = await userRepository.findByUsername(username);

    if (!user) {
      console.warn(`[AUTH] Login gagal: User "${username}" tidak ditemukan di tabel users.`);
      const error = new Error('Kredensial tidak valid (Username atau password salah)');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    // 2. Cek apakah akun aktif
    if (!user.is_active) {
      console.warn(`[AUTH] Login gagal: Akun "${username}" berstatus non-aktif (is_active = false).`);
      const error = new Error('Akun karyawan tidak aktif di sistem. Hubungi Administrator / HR.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    // 3. Verifikasi kecocokan password (bcrypt hash dengan fallback plain text)
    const isPasswordValid =
      (await bcrypt.compare(password, user.password)) ||
      password === user.password;

    if (!isPasswordValid) {
      console.warn(`[AUTH] Login gagal: Password untuk user "${username}" tidak cocok.`);
      const error = new Error('Kredensial tidak valid (Username atau password salah)');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    // 4. Update waktu login terakhir di database
    const updatedUser = await userRepository.updateLastLogin(user.id);

    // 5. Kembalikan data user yang bersih (tanpa hash password)
    return {
      user: {
        id: updatedUser.id,
        nik: updatedUser.nik,
        name: updatedUser.name,
        username: updatedUser.username,
        store_code: updatedUser.store_code,
        outlet_id: updatedUser.store_code, // Alias kompatibel jika frontend masih membaca field outlet_id
        role: 'sales',
        is_active: updatedUser.is_active,
        last_synced_at: updatedUser.last_synced_at,
      },
      token: `eslip-token-${updatedUser.nik}-${Date.now()}`,
    };
  },
};

module.exports = authService;
