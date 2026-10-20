const { Pool } = require('pg');

// Inisialisasi PostgreSQL Connection Pool menggunakan kredensial dari .env
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'eslip_db',
  max: 20, // Maksimal 20 koneksi konkuren
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  // console.log('[DB] Koneksi baru terbentuk ke PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB Error] Kesalahan pada PostgreSQL Pool:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
