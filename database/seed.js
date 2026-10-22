import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function runSeed() {
  let pg;
  try {
    ({ default: pg } = await import('pg'));
  } catch (err) {
    console.error('\n[PERHATIAN] Driver "pg" belum terinstall.');
    console.log('Jalankan perintah berikut di folder e-slip-backend:');
    console.log('  npm install pg\n');
    console.log('Atau Anda dapat mengeksekusi langsung file SQL menggunakan psql/DBeaver:');
    console.log(`  psql -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'eslip_db'} -f database/seed.sql\n`);
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
  console.log('MENJALANKAN SEEDER DATABASE E-SLIP (PostgreSQL)');
  console.log('========================================================');
  console.log(`Target DB: ${process.env.DB_NAME || 'eslip_db'} @ ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);

  try {
    const client = await pool.connect();
    console.log('Berhasil terhubung ke database.');

    const seedPath = path.join(import.meta.dirname, 'seed.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    console.log('Menyuntikkan dummy data ke database...');
    await client.query(sql);

    console.log('✅ Seeding database berhasil diselesaikan!');
    console.log('Dummy data yang berhasil diisi:');
    console.log('  - Users (Sales Cempaka Putih & Kokas)');
    console.log('  - E-Slips (Open, Locked, Paid, Expired, Cancelled, SPO)');
    console.log('  - E-Slip Items (TV, Kulkas, Minyak, Beras, AC Daikin, dll)');
    console.log('  - E-Slip Status Logs (Lifecycle tracking)');
    console.log('  - POS Transaction Histories (Inquiry, Payment, Outlet Mismatch, Expired)');
    console.log('  - SPO Items (Data validasi ERP)');

    client.release();
  } catch (error) {
    console.error('❌ Gagal menjalankan seeder:', error.message);
  } finally {
    await pool.end();
  }
}

runSeed();
