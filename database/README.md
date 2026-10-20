# Dokumentasi Database Migration & Seeder E-Slip

Folder ini berisi seluruh skrip migrasi skema tabel (DDL) dan seeder data dummy untuk aplikasi **E-Slip (Trans Retail)** berbasis **PostgreSQL**.

---

## 📁 Struktur Direktori

```text
database/
├── schema.sql           # File tunggal DDL lengkap (Semua tabel, PK, FK, Index)
├── seed.sql             # File tunggal Seeder lengkap dengan skenario dummy nyata
├── migrate.js           # Runner migrasi otomatis via Node.js
├── seed.js              # Runner seeder otomatis via Node.js
├── README.md            # Dokumentasi panduan eksekusi
└── migrations/          # File migrasi terpisah per tabel
    ├── 001_create_users_table.sql
    ├── 002_create_e_slips_table.sql
    ├── 003_create_e_slip_items_table.sql
    ├── 004_create_e_slip_status_logs_table.sql
    ├── 005_create_pos_transaction_histories_table.sql
    └── 006_create_spo_items_table.sql
```

---

## 🏛️ Standar Enterprise PMO Trans Retail

Setiap tabel mengimplementasikan **4 Mandatory Audit Fields**:
1. `created_at` (`TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`)
2. `created_by` (`VARCHAR(50) NOT NULL`)
3. `updated_date` (`TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`)
4. `updated_by` (`VARCHAR(50) NOT NULL`)

---

## 🚀 Cara Menjalankan Migrasi & Seeder

### Opsi 1: Menggunakan PostgreSQL CLI (`psql`) — *Paling Cepat*

1. **Pastikan database `eslip_db` sudah dibuat:**
   ```bash
   createdb -U postgres eslip_db
   ```

2. **Jalankan Migrasi Skema:**
   ```bash
   psql -U postgres -d eslip_db -f database/schema.sql
   ```

3. **Jalankan Seeder Dummy Data:**
   ```bash
   psql -U postgres -d eslip_db -f database/seed.sql
   ```

---

### Opsi 2: Menggunakan GUI (DBeaver / pgAdmin / TablePlus)

1. Buka DBeaver / pgAdmin dan hubungkan ke database PostgreSQL Anda.
2. Buka file `database/schema.sql`, lalu jalankan (`Execute Script` / `Ctrl+Enter`).
3. Buka file `database/seed.sql`, lalu jalankan untuk mengisi data dummy.

---

### Opsi 3: Menggunakan Script Runner Node.js

1. Masuk ke folder backend dan pastikan driver `pg` terinstall:
   ```bash
   cd e-slip-backend
   npm install pg
   ```

2. Konfigurasi kredensial database di `.env`:
   ```ini
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=password_anda
   DB_NAME=eslip_db
   ```

3. Jalankan migrasi dan seeder:
   ```bash
   node database/migrate.js
   node database/seed.js
   ```

---

## 📊 Data Dummy yang Tersedia di `seed.sql`

| No | Entitas | Skenario Dummy Data |
|---|---|---|
| 1 | **Users** | Sales Cempaka Putih (aktif), Sales Kokas (aktif), Sales Non-Aktif. Password default: `admin123`. |
| 2 | **E-Slips** | Berbagai status: `Paid` (selesai bayar), `Locked` (di kasir), `Open` (siap dibayar), `Open` dengan SPO, `Expired` (>2 jam), dan `Cancelled`. |
| 3 | **E-Slip Items** | Barang retail nyata: Smart TV LG 43", Kulkas Sharp 2 Pintu, Minyak Tropical, Beras Pandan Wangi, AC Daikin 1 PK. |
| 4 | **E-Slip Status Logs** | Jejak lifecycle transisi status untuk setiap slip. |
| 5 | **POS Transaction Histories** | Rekam jejak: Inquiry sukses, Konfirmasi PAID dengan nomor struk kasir, **Inquiry ditolak karena Outlet Mismatch**, dan Inquiry ditolak karena Expired. |
| 6 | **SPO Items** | Data integrasi ERP untuk slip dengan Sales Purchase Order. |

