import * as db from '../config/db.js';

export async function findByUsername(username) {
  const query = `
    SELECT 
      id, 
      nik, 
      name, 
      username, 
      password, 
      store_code, 
      is_active, 
      last_synced_at,
      created_at,
      updated_date
    FROM users 
    WHERE username = $1
    LIMIT 1;
  `;
  const { rows } = await db.query(query, [username]);
  return rows[0] || null;
}

export async function findByNik(nik) {
  const query = `
    SELECT 
      id, 
      nik, 
      name, 
      username, 
      store_code, 
      is_active, 
      last_synced_at 
    FROM users 
    WHERE nik = $1 
    LIMIT 1;
  `;
  const { rows } = await db.query(query, [nik]);
  return rows[0] || null;
}

export async function findById(id) {
  const query = `
    SELECT 
      id, 
      nik, 
      name, 
      username, 
      store_code, 
      is_active, 
      last_synced_at 
    FROM users 
    WHERE id = $1 
    LIMIT 1;
  `;
  const { rows } = await db.query(query, [id]);
  return rows[0] || null;
}

export async function updateLastLogin(id) {
  const query = `
    UPDATE users
    SET 
      last_synced_at = CURRENT_TIMESTAMP,
      updated_date = CURRENT_TIMESTAMP,
      updated_by = 'SYSTEM_LOGIN'
    WHERE id = $1
    RETURNING id, nik, name, username, store_code, is_active, last_synced_at;
  `;
  const { rows } = await db.query(query, [id]);
  return rows[0];
}

export async function upsertUser(userData) {
  const query = `
    INSERT INTO users (
      nik, name, username, password, store_code, is_active, last_synced_at, created_by, updated_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 'HCM_SYNC', 'HCM_SYNC')
    ON CONFLICT (nik)
    DO UPDATE SET
      name = EXCLUDED.name,
      username = EXCLUDED.username,
      store_code = EXCLUDED.store_code,
      is_active = EXCLUDED.is_active,
      last_synced_at = CURRENT_TIMESTAMP,
      updated_date = CURRENT_TIMESTAMP,
      updated_by = 'HCM_SYNC'
    RETURNING id, nik, name, username, store_code, is_active, last_synced_at;
  `;
  const values = [
    userData.nik,
    userData.name,
    userData.username || userData.nik,
    userData.password || '',
    userData.store_code || userData.outlet_id || 'STORE-10011',
    userData.is_active !== undefined ? userData.is_active : true,
  ];
  const { rows } = await db.query(query, values);
  return rows[0];
}

export async function getAllUsers() {
  const query = `
    SELECT id, nik, name, username, store_code, is_active, last_synced_at
    FROM users
    ORDER BY id ASC;
  `;
  const { rows } = await db.query(query);
  return rows;
}
