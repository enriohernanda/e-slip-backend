/**
 * Runner Script Migrasi Database PostgreSQL
 * Menggunakan pg (node-postgres)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let pg;
  try {
    pg = require('pg');
  } catch (err) {
    console.error('\n[PERHATIAN] Driver "pg" belum terinstall.');
    console.log('Jalankan perintah berikut di folder e-slip-backend:');
    console.log('  npm install pg\n');
    console.log('Atau Anda dapat mengeksekusi langsung file SQL menggunakan psql/DBeaver:');
    console.log(`  psql -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'eslip_db'} -f database/schema.sql\n`);
    process.exit(1);
  }

  const { Pool } = pg;
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eslip_db',
  });

  console.log('========================================================');
  console.log('MENJALANKAN MIGRASI DATABASE E-SLIP (PostgreSQL)');
  console.log('========================================================');
  console.log(`Target DB: ${process.env.DB_NAME || 'eslip_db'} @ ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);

  try {
    const client = await pool.connect();
    console.log('Berhasil terhubung ke database.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Mengeksekusi skema tabel...');
    await client.query(sql);

    console.log('✅ Migrasi database berhasil diselesaikan!');
    console.log('Tabel yang dibuat:');
    console.log('  1. users (dengan 4 audit fields)');
    console.log('  2. e_slips (dengan 4 audit fields)');
    console.log('  3. e_slip_items (dengan 4 audit fields)');
    console.log('  4. e_slip_status_logs (dengan 4 audit fields)');
    console.log('  5. pos_transaction_histories (dengan 4 audit fields)');
    console.log('  6. spo_items (dengan 4 audit fields)');

    client.release();
  } catch (error) {
    console.error('❌ Gagal menjalankan migrasi:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();

