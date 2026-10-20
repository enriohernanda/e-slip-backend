-- =============================================================================
-- E-SLIP SEEDER (DUMMY DATA)
-- Database Engine: PostgreSQL 14+
-- =============================================================================

-- Bersihkan data sebelumnya (TRUNCATE restart identity)
TRUNCATE TABLE spo_items, pos_transaction_histories, e_slip_status_logs, e_slip_items, e_slips, users RESTART IDENTITY CASCADE;

-- =============================================================================
-- 1. SEED USERS
-- Password default: 'admin123' (hash bcrypt)
-- =============================================================================
INSERT INTO users (nik, name, username, password, store_code, is_active, last_synced_at, created_at, created_by, updated_date, updated_by)
VALUES
(
    'SALES-10011-001',
    'Ahmad Fauzi (Sales Dept Elektronik)',
    'sales01',
    '$2a$10$7Z2v1wz0Z3rD3I9v2B5fIe1Yh/J1b8lP.GZ1D1F6q0w7mK4V.P4sO',
    'STORE-10011',
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    'HCM_SYNC_JOB',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'HCM_SYNC_JOB'
),
(
    'SALES-10011-002',
    'Siti Nurhaliza (Sales Dept Fresh & Groceries)',
    'sales02',
    '$2a$10$7Z2v1wz0Z3rD3I9v2B5fIe1Yh/J1b8lP.GZ1D1F6q0w7mK4V.P4sO',
    'STORE-10011',
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    'HCM_SYNC_JOB',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'HCM_SYNC_JOB'
),
(
    'SALES-10012-001',
    'Budi Santoso (Sales Transmart Kokas)',
    'sales_kokas',
    '$2a$10$7Z2v1wz0Z3rD3I9v2B5fIe1Yh/J1b8lP.GZ1D1F6q0w7mK4V.P4sO',
    'STORE-10012',
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    'HCM_SYNC_JOB',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    'HCM_SYNC_JOB'
),
(
    'SALES-10011-099',
    'Dewi Sartika (Sales Non-Aktif)',
    'sales_inactive',
    '$2a$10$7Z2v1wz0Z3rD3I9v2B5fIe1Yh/J1b8lP.GZ1D1F6q0w7mK4V.P4sO',
    'STORE-10011',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '60 days',
    CURRENT_TIMESTAMP - INTERVAL '90 days',
    'HCM_SYNC_JOB',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    'ADMIN_USER'
);

-- =============================================================================
-- 2. SEED E_SLIPS
-- Format nomor slip: [outlet 5][YYMMDD][seq] -> Contoh: 10011261016000001
-- =============================================================================
INSERT INTO e_slips (
    slip_number, barcode, customer_name, customer_phone, shipping_address,
    is_spo, spo_number, status, store_code, outlet_id, created_by_user_id,
    expired_at, locked_at, paid_at, cancelled_at,
    created_at, created_by, updated_date, updated_by
)
VALUES
-- Slip 1: Status 'Paid' (Selesai transaksi via kasir POS)
(
    '10011261020000001',
    '10011261020000001',
    'Bambang Pamungkas',
    '081234567890',
    'Jl. Cempaka Putih Raya No. 45, Jakarta Pusat',
    FALSE,
    NULL,
    'Paid',
    'STORE-10011',
    '10011',
    1,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '2 hour 45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '2 hour 40 minutes',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    'SALES-10011-001',
    CURRENT_TIMESTAMP - INTERVAL '2 hour 40 minutes',
    'POS-CASHIER-01'
),

-- Slip 2: Status 'Locked' (Sedang diproses kasir di POS)
(
    '10011261020000002',
    '10011261020000002',
    'Ibu Ratna Juwita',
    '081398765432',
    'Apartemen Green Pramuka Tower F No. 12B',
    FALSE,
    NULL,
    'Locked',
    'STORE-10011',
    '10011',
    2,
    CURRENT_TIMESTAMP + INTERVAL '1 hour 45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    'SALES-10011-002',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes',
    'POS-CASHIER-02'
),

-- Slip 3: Status 'Open' (Siap dibayar oleh customer)
(
    '10011261020000003',
    '10011261020000003',
    'Dedy Corbuzier',
    '081122334455',
    'Jl. Bintaro Utama Sektor 3A, Tangerang Selatan',
    FALSE,
    NULL,
    'Open',
    'STORE-10011',
    '10011',
    1,
    CURRENT_TIMESTAMP + INTERVAL '1 hour 30 minutes',
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    'SALES-10011-001',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    'SALES-10011-001'
),

-- Slip 4: Status 'Open' dengan SPO (Sales Purchase Order dari ERP)
(
    '10011261020000004',
    '10011261020000004',
    'PT Mahakarya Artha Mandiri (Bpk. Hendra)',
    '082155667788',
    'Kawasan Industri Pulogadung Blok III B, Jakarta Timur',
    TRUE,
    'SPO-ERP-2026-X091',
    'Open',
    'STORE-10011',
    '10011',
    1,
    CURRENT_TIMESTAMP + INTERVAL '1 hour 50 minutes',
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    'SALES-10011-001',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    'SALES-10011-001'
),

-- Slip 5: Status 'Expired' (Melebihi 2 jam tanpa diproses kasir)
(
    '10011261020000005',
    '10011261020000005',
    'Wawan Setiawan',
    '087788990011',
    'Jl. Utan Kayu No. 10, Jakarta Timur',
    FALSE,
    NULL,
    'Expired',
    'STORE-10011',
    '10011',
    2,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '3 hour 15 minutes',
    'SALES-10011-002',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    'SYSTEM_JOB'
),

-- Slip 6: Status 'Cancelled' (Dibatalkan oleh sales / customer)
(
    '10011261020000006',
    '10011261020000006',
    'Rina Melati',
    '085611223344',
    'Jl. Percetakan Negara IX',
    FALSE,
    NULL,
    'Cancelled',
    'STORE-10011',
    '10011',
    1,
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    'SALES-10011-001',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    'SALES-10011-001'
);

-- =============================================================================
-- 3. SEED E_SLIP_ITEMS
-- Snapshot harga dan produk retail
-- =============================================================================
INSERT INTO e_slip_items (
    e_slip_id, sku, item_name, quantity, original_price, discount_price, effective_price, subtotal,
    created_at, created_by, updated_date, updated_by
)
VALUES
-- Items untuk Slip 1 (Paid - Belanja Elektronik & Groceries)
(1, 'SKU-TV-LG-43', 'LG Smart LED TV 43 Inch UHD 4K 43UR7500', 1, 4599000.00, 4299000.00, 4299000.00, 4299000.00, CURRENT_TIMESTAMP - INTERVAL '3 hours', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '3 hours', 'SALES-10011-001'),
(1, 'SKU-BRKT-WALL', 'Bracket TV Swivel Universal 32-55 Inch', 1, 250000.00, NULL, 250000.00, 250000.00, CURRENT_TIMESTAMP - INTERVAL '3 hours', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '3 hours', 'SALES-10011-001'),
(1, 'SKU-HDMI-HIGH', 'Kabel HDMI 2.1 Ultra High Speed 2M', 2, 95000.00, 75000.00, 75000.00, 150000.00, CURRENT_TIMESTAMP - INTERVAL '3 hours', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '3 hours', 'SALES-10011-001'),

-- Items untuk Slip 2 (Locked - Kulkas)
(2, 'SKU-FRG-SHARP-2D', 'Sharp Kulkas 2 Pintu Inverter SJ-326XI-MK', 1, 3850000.00, 3650000.00, 3650000.00, 3650000.00, CURRENT_TIMESTAMP - INTERVAL '15 minutes', 'SALES-10011-002', CURRENT_TIMESTAMP - INTERVAL '15 minutes', 'SALES-10011-002'),

-- Items untuk Slip 3 (Open - Fresh Food & Household)
(3, 'SKU-OIL-TROP-2L', 'Minyak Goreng Tropical Botol 2 Liter', 4, 38500.00, 34900.00, 34900.00, 139600.00, CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'SALES-10011-001'),
(3, 'SKU-RICE-PANDAN-5K', 'Beras Ramos Pandan Wangi Premium 5 KG', 2, 79500.00, NULL, 79500.00, 159000.00, CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'SALES-10011-001'),
(3, 'SKU-MILK-GREEN-1L', 'Greenfields Fresh Milk Pasteurisasi 1 Liter', 3, 32000.00, 28500.00, 28500.00, 85500.00, CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'SALES-10011-001'),

-- Items untuk Slip 4 (Open dengan SPO - Pembelian Partai Besar Perusahaan)
(4, 'SKU-AC-DAIKIN-1PK', 'Daikin AC Inverter Flash 1 PK FTKQ25UVMV', 5, 5200000.00, 4850000.00, 4850000.00, 24250000.00, CURRENT_TIMESTAMP - INTERVAL '10 minutes', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '10 minutes', 'SALES-10011-001'),
(4, 'SKU-PIPE-TEMBAGA-5M', 'Paket Pipa AC Tembaga Tebal 0.6mm (5 Meter)', 5, 350000.00, NULL, 350000.00, 1750000.00, CURRENT_TIMESTAMP - INTERVAL '10 minutes', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '10 minutes', 'SALES-10011-001'),

-- Items untuk Slip 5 (Expired)
(5, 'SKU-WM-POLYTRON-8K', 'Polytron Mesin Cuci 1 Tabung Zeromatic 8 KG', 1, 2350000.00, 2199000.00, 2199000.00, 2199000.00, CURRENT_TIMESTAMP - INTERVAL '3 hour 15 minutes', 'SALES-10011-002', CURRENT_TIMESTAMP - INTERVAL '3 hour 15 minutes', 'SALES-10011-002'),

-- Items untuk Slip 6 (Cancelled)
(6, 'SKU-MCW-PANASONIC', 'Panasonic Microwave Oven 20L NN-SM32NBTTE', 1, 1150000.00, NULL, 1150000.00, 1150000.00, CURRENT_TIMESTAMP - INTERVAL '2 hours', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'SALES-10011-001');

-- =============================================================================
-- 4. SEED E_SLIP_STATUS_LOGS (Audit Trail Domain State Machine)
-- =============================================================================
INSERT INTO e_slip_status_logs (
    e_slip_id, previous_status, new_status, changed_by, change_source, notes,
    created_at, created_by, updated_date, updated_by
)
VALUES
-- Logs Slip 1 (Open -> Locked -> Paid)
(1, NULL, 'Open', 'SALES-10011-001', 'SALES_APP', 'E-Slip pertama kali dibuat oleh sales', CURRENT_TIMESTAMP - INTERVAL '3 hours', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '3 hours', 'SALES-10011-001'),
(1, 'Open', 'Locked', 'KASIR-001', 'POS', 'Barcode discan oleh kasir di register POS-01', CURRENT_TIMESTAMP - INTERVAL '2 hour 45 minutes', 'KASIR-001', CURRENT_TIMESTAMP - INTERVAL '2 hour 45 minutes', 'KASIR-001'),
(1, 'Locked', 'Paid', 'KASIR-001', 'POS', 'Pembayaran kasir selesai, struk #REC-20261020-091 terbit', CURRENT_TIMESTAMP - INTERVAL '2 hour 40 minutes', 'KASIR-001', CURRENT_TIMESTAMP - INTERVAL '2 hour 40 minutes', 'KASIR-001'),

-- Logs Slip 2 (Open -> Locked)
(2, NULL, 'Open', 'SALES-10011-002', 'SALES_APP', 'E-Slip dibuat oleh sales', CURRENT_TIMESTAMP - INTERVAL '15 minutes', 'SALES-10011-002', CURRENT_TIMESTAMP - INTERVAL '15 minutes', 'SALES-10011-002'),
(2, 'Open', 'Locked', 'KASIR-002', 'POS', 'Sedang ditransaksikan di kasir counter 2', CURRENT_TIMESTAMP - INTERVAL '5 minutes', 'KASIR-002', CURRENT_TIMESTAMP - INTERVAL '5 minutes', 'KASIR-002'),

-- Logs Slip 3 (Open)
(3, NULL, 'Open', 'SALES-10011-001', 'SALES_APP', 'E-Slip dibuat dan siap dibawa customer ke kasir', CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'SALES-10011-001'),

-- Logs Slip 4 (Open dengan SPO)
(4, NULL, 'Open', 'SALES-10011-001', 'SALES_APP', 'E-Slip dibuat dengan referensi nomor SPO: SPO-ERP-2026-X091', CURRENT_TIMESTAMP - INTERVAL '10 minutes', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '10 minutes', 'SALES-10011-001'),

-- Logs Slip 5 (Open -> Expired)
(5, NULL, 'Open', 'SALES-10011-002', 'SALES_APP', 'E-Slip dibuat', CURRENT_TIMESTAMP - INTERVAL '3 hour 15 minutes', 'SALES-10011-002', CURRENT_TIMESTAMP - INTERVAL '3 hour 15 minutes', 'SALES-10011-002'),
(5, 'Open', 'Expired', 'SYSTEM', 'SYSTEM_JOB', 'E-Slip otomatis kedaluwarsa setelah melewati batas 2 jam', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'SYSTEM', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'SYSTEM'),

-- Logs Slip 6 (Open -> Cancelled)
(6, NULL, 'Open', 'SALES-10011-001', 'SALES_APP', 'E-Slip dibuat', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'SALES-10011-001'),
(6, 'Open', 'Cancelled', 'SALES-10011-001', 'SALES_APP', 'Customer membatalkan pembelian karena ingin mengganti model', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'SALES-10011-001', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'SALES-10011-001');

-- =============================================================================
-- 5. SEED POS_TRANSACTION_HISTORIES (Integrasi Kasir POS)
-- =============================================================================
INSERT INTO pos_transaction_histories (
    e_slip_id, barcode, action_type, pos_terminal_id, pos_store_code, pos_outlet_id,
    cashier_id, receipt_number, response_status, response_message,
    created_at, created_by, updated_date, updated_by
)
VALUES
-- Kasus 1: Inquiry Sukses untuk Slip 1
(
    1,
    '10011261020000001',
    'INQUIRY',
    'POS-REG-01',
    'STORE-10011',
    '10011',
    'KASIR-001',
    NULL,
    'SUCCESS',
    'Inquiry barcode berhasil, status E-Slip berubah menjadi Locked',
    CURRENT_TIMESTAMP - INTERVAL '2 hour 45 minutes',
    'POS-REG-01',
    CURRENT_TIMESTAMP - INTERVAL '2 hour 45 minutes',
    'POS-REG-01'
),

-- Kasus 2: Konfirmasi Pembayaran Sukses untuk Slip 1 (PAID)
(
    1,
    '10011261020000001',
    'PAYMENT',
    'POS-REG-01',
    'STORE-10011',
    '10011',
    'KASIR-001',
    'REC-20261020-091',
    'SUCCESS',
    'Pembayaran dikonfirmasi oleh kasir POS, nomor struk REC-20261020-091',
    CURRENT_TIMESTAMP - INTERVAL '2 hour 40 minutes',
    'POS-REG-01',
    CURRENT_TIMESTAMP - INTERVAL '2 hour 40 minutes',
    'POS-REG-01'
),

-- Kasus 3: Inquiry Sukses untuk Slip 2 (saat ini berstatus Locked)
(
    2,
    '10011261020000002',
    'INQUIRY',
    'POS-REG-02',
    'STORE-10011',
    '10011',
    'KASIR-002',
    NULL,
    'SUCCESS',
    'Inquiry barcode sukses. Total belanja: Rp 3.650.000',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes',
    'POS-REG-02',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes',
    'POS-REG-02'
),

-- Kasus 4: INQUIRY DITOLAK KARENA OUTLET MISMATCH (Audit Fraud / Human Error Kasir)
-- Kasir dari outlet Kokas (10012) mencoba scan slip yang diterbitkan oleh outlet Cempaka Putih (10011)
(
    3,
    '10011261020000003',
    'INQUIRY',
    'POS-REG-99',
    'STORE-10012',
    '10012',
    'KASIR-KOKAS-01',
    NULL,
    'OUTLET_MISMATCH',
    'Ditolak: Outlet POS (10012) tidak sesuai dengan Outlet E-Slip (10011)',
    CURRENT_TIMESTAMP - INTERVAL '20 minutes',
    'POS-REG-99',
    CURRENT_TIMESTAMP - INTERVAL '20 minutes',
    'POS-REG-99'
),

-- Kasus 5: INQUIRY DITOLAK KARENA KEDALUWARSA (Slip 5 sudah Expired)
(
    5,
    '10011261020000005',
    'INQUIRY',
    'POS-REG-01',
    'STORE-10011',
    '10011',
    'KASIR-001',
    NULL,
    'EXPIRED',
    'Ditolak: E-Slip telah kedaluwarsa pada pukul ' || TO_CHAR(CURRENT_TIMESTAMP - INTERVAL '1 hour', 'HH24:MI'),
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    'POS-REG-01',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    'POS-REG-01'
),

-- Kasus 6: INQUIRY DITOLAK KARENA BARCODE TIDAK DITEMUKAN
(
    NULL,
    '99999999999999999',
    'INQUIRY',
    'POS-REG-02',
    'STORE-10011',
    '10011',
    'KASIR-002',
    NULL,
    'NOT_FOUND',
    'Ditolak: Barcode 99999999999999999 tidak terdaftar di sistem E-Slip',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    'POS-REG-02',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    'POS-REG-02'
);

-- =============================================================================
-- 6. SEED SPO_ITEMS (Data dari ERP untuk Slip 4)
-- =============================================================================
INSERT INTO spo_items (
    e_slip_id, spo_number, sku, quantity, fetched_at,
    created_at, created_by, updated_date, updated_by
)
VALUES
(
    4,
    'SPO-ERP-2026-X091',
    'SKU-AC-DAIKIN-1PK',
    5,
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    'ERP_INTEGRATION_JOB',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    'ERP_INTEGRATION_JOB'
),
(
    4,
    'SPO-ERP-2026-X091',
    'SKU-PIPE-TEMBAGA-5M',
    5,
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    'ERP_INTEGRATION_JOB',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    'ERP_INTEGRATION_JOB'
);

