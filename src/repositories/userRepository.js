const db = require('../config/db');

// In-memory data store untuk simulasi database sebelum PostgreSQL asli dipasang
let mockUsersTable = [
  {
    id: 1,
    nik: '1002345',
    external_user_id: 'HCM-101',
    name: 'Aryan Fitrah',
    email: 'aryan@gmail.com',
    outlet_id: 'OUT-JKT-01',
    role: 'sales',
    is_active: true,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const userRepository = {
  /**
   * Menyimpan atau memperbarui data user berdasarkan NIK (Upsert).
   * @param {Object} userData
   */
  async upsertUser(userData) {
    const isMock = db.isMock !== false;

    if (isMock) {
      console.log(`[Repository Mock] Melakukan upsert data user NIK: ${userData.nik}`);

      const existingIndex = mockUsersTable.findIndex((u) => u.nik === userData.nik);
      const now = new Date().toISOString();

      if (existingIndex !== -1) {
        // UPDATE data yang sudah ada
        mockUsersTable[existingIndex] = {
          ...mockUsersTable[existingIndex],
          external_user_id: userData.external_user_id || mockUsersTable[existingIndex].external_user_id,
          name: userData.name || mockUsersTable[existingIndex].name,
          email: userData.email || mockUsersTable[existingIndex].email,
          outlet_id: userData.outlet_id || mockUsersTable[existingIndex].outlet_id,
          role: userData.role || mockUsersTable[existingIndex].role,
          is_active: userData.is_active !== undefined ? userData.is_active : mockUsersTable[existingIndex].is_active,
          last_synced_at: now,
          updated_at: now,
        };
        return mockUsersTable[existingIndex];
      } else {
        // INSERT data baru
        const newUser = {
          id: mockUsersTable.length + 1,
          nik: userData.nik,
          external_user_id: userData.external_user_id,
          name: userData.name,
          email: userData.email,
          outlet_id: userData.outlet_id,
          role: userData.role || 'sales',
          is_active: userData.is_active !== undefined ? userData.is_active : true,
          last_synced_at: now,
          created_at: now,
          updated_at: now,
        };
        mockUsersTable.push(newUser);
        return newUser;
      }
    }

    // Nanti jika database PostgreSQL sudah aktif:
    /*
    const query = `
      INSERT INTO users (
        nik, external_user_id, name, email, outlet_id, role, is_active, last_synced_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      ON CONFLICT (nik)
      DO UPDATE SET
        external_user_id = EXCLUDED.external_user_id,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        outlet_id = EXCLUDED.outlet_id,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        last_synced_at = NOW(),
        updated_at = NOW()
      RETURNING *;
    `;
    const values = [
      userData.nik,
      userData.external_user_id,
      userData.name,
      userData.email,
      userData.outlet_id,
      userData.role,
      userData.is_active,
    ];
    const { rows } = await db.pool.query(query, values);
    return rows[0];
    */
  },

  /**
   * Mencari data user berdasarkan NIK
   * (Berguna untuk filter toko/outlet berdasarkan login sales)
   */
  async findByNik(nik) {
    const isMock = db.isMock !== false;
    if (isMock) {
      return mockUsersTable.find((u) => u.nik === nik) || null;
    }
    // const { rows } = await db.pool.query('SELECT * FROM users WHERE nik = $1 LIMIT 1', [nik]);
    // return rows[0] || null;
  },

  /**
   * Mengambil semua user (berguna untuk verifikasi hasil mock)
   */
  async getAllUsers() {
    return mockUsersTable;
  },
};

module.exports = userRepository;
