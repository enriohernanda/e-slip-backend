// Konfigurasi koneksi database PostgreSQL
// Saat ini menggunakan mode mock karena koneksi database belum diberikan oleh kantor.

const isMock = process.env.DB_MOCK !== 'false';

let pool = null;

if (!isMock) {
  // Ketika PostgreSQL siap digunakan:
  // 1. Install driver: npm install pg
  // 2. Uncomment baris berikut:
  /*
  const { Pool } = require('pg');
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eslip_db',
  });
  */
}

module.exports = {
  isMock,
  pool,
  status: isMock ? 'Mode Mock (In-Memory)' : 'Terhubung ke PostgreSQL',
};
