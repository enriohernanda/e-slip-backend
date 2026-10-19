const userRepository = require('../repositories/userRepository');
const hcmClient = require('../utils/hcmClient');

const authService = {
  async login(username, password) {
    // 1. Panggil HCM eksternal menggunakan username
    const hcmUser = await hcmClient.authenticate(username, password);

    // 2. Sinkronisasikan data ke tabel users lokal (Upsert by NIK)
    const syncedUser = await userRepository.upsertUser({
      nik: hcmUser.nik,
      external_user_id: hcmUser.external_user_id,
      name: hcmUser.name,
      email: hcmUser.email,
      outlet_id: hcmUser.outlet_id,
      role: hcmUser.role,
      is_active: hcmUser.is_active,
    });

    // 3. Return payload yang siap digunakan frontend
    return {
      user: {
        id: syncedUser.id,
        nik: syncedUser.nik,
        name: syncedUser.name,
        email: syncedUser.email,
        outlet_id: syncedUser.outlet_id,
        role: syncedUser.role,
        last_synced_at: syncedUser.last_synced_at,
      },
      token: hcmUser.token,
    };
  },
};

module.exports = authService;
