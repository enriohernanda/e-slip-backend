const axios = require('axios');

// Simulasi database internal HCM eksternal untuk pengujian lokal
const MOCK_HCM_USERS = [
  {
    external_user_id: 'HCM-101',
    username: 'budi',
    nik: '1002345',
    name: 'Budi Santoso',
    email: 'budi@company.co.id',
    password: 'password123',
    outlet_id: 'OUT-JKT-01',
    role: 'sales',
    is_active: true,
  },
  {
    external_user_id: 'HCM-102',
    username: 'siti',
    nik: '1002346',
    name: 'Siti Rahma',
    email: 'siti@company.co.id',
    password: 'password123',
    outlet_id: 'OUT-BDG-02',
    role: 'sales',
    is_active: true,
  },
];

const hcmClient = {
  /**
   * Mengirim request login ke HCM API eksternal menggunakan username & password.
   * Jika USE_MOCK_HCM !== 'false', kita gunakan simulasi data.
   */
  async authenticate(username, password) {
    const isMock = process.env.USE_MOCK_HCM !== 'false';

    if (isMock) {
      console.log(`[HCM Client Mock] Menerima request login untuk username: ${username}`);

      // Cari user berdasarkan username (atau NIK jika diinputkan sebagai username)
      const user = MOCK_HCM_USERS.find(
        (u) => (u.username === username || u.nik === username) && u.password === password
      );

      if (!user) {
        const error = new Error('Kredensial tidak valid di HCM (Username atau password salah)');
        error.statusCode = 401;
        error.code = 'UNAUTHORIZED';
        throw error;
      }

      if (!user.is_active) {
        const error = new Error('Akun karyawan tidak aktif di sistem HCM');
        error.statusCode = 403;
        error.code = 'FORBIDDEN';
        throw error;
      }

      // Simulasi token dari HCM
      return {
        external_user_id: user.external_user_id,
        nik: user.nik,
        name: user.name,
        email: user.email,
        outlet_id: user.outlet_id,
        role: user.role,
        is_active: user.is_active,
        token: `hcm-mock-token-${user.nik}-${Date.now()}`,
      };
    }

    // Nanti jika URL API HCM asli sudah diberikan oleh kantor:
    try {
      const response = await axios.post(
        `${process.env.HCM_API_BASE_URL}/auth/login`,
        {
          username: username,
          password: password,
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (err) {
      const error = new Error(
        err.response?.data?.message || 'Gagal berkomunikasi dengan server HCM eksternal'
      );
      error.statusCode = err.response?.status || 502;
      error.code = 'HCM_GATEWAY_ERROR';
      throw error;
    }
  },
};

module.exports = hcmClient;
