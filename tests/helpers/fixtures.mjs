import { normalizeSql } from './harness.mjs';

// Expected SQL, whitespace-normalized, captured from the pre-refactor implementation.
export const SQL = {
  findUserForLogin:
    'SELECT id, nik, name, username, password, store_code, is_active, last_synced_at, created_at, updated_date FROM users WHERE username = $1 OR nik = $1 LIMIT 1;',
  findUserByNik:
    'SELECT id, nik, name, username, store_code, is_active, last_synced_at FROM users WHERE nik = $1 LIMIT 1;',
  findUserById:
    'SELECT id, nik, name, username, store_code, is_active, last_synced_at FROM users WHERE id = $1 LIMIT 1;',
  getAllUsers: 'SELECT id, nik, name, username, store_code, is_active, last_synced_at FROM users ORDER BY id ASC;',
  upsertUser:
    "INSERT INTO users ( nik, name, username, password, store_code, is_active, last_synced_at, created_by, updated_by ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 'HCM_SYNC', 'HCM_SYNC') ON CONFLICT (nik) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username, store_code = EXCLUDED.store_code, is_active = EXCLUDED.is_active, last_synced_at = CURRENT_TIMESTAMP, updated_date = CURRENT_TIMESTAMP, updated_by = 'HCM_SYNC' RETURNING id, nik, name, username, store_code, is_active, last_synced_at;",
  updateLastLogin:
    "UPDATE users SET last_synced_at = CURRENT_TIMESTAMP, updated_date = CURRENT_TIMESTAMP, updated_by = 'SYSTEM_LOGIN' WHERE id = $1 RETURNING id, nik, name, username, store_code, is_active, last_synced_at;",
  expireSlips:
    "UPDATE e_slips SET status = 'Expired', updated_date = CURRENT_TIMESTAMP, updated_by = 'SYSTEM_TIMEOUT' WHERE status = 'Open' AND expired_at < CURRENT_TIMESTAMP;",
  advisoryLock: 'SELECT pg_advisory_xact_lock(hashtext($1));',
  lastSlipNumber: "SELECT slip_number FROM e_slips WHERE slip_number LIKE $1 || '%' ORDER BY slip_number DESC LIMIT 1;",
  insertSlip:
    "INSERT INTO e_slips ( slip_number, barcode, customer_name, customer_phone, shipping_address, is_spo, spo_number, status, store_code, outlet_id, created_by_user_id, expired_at, created_at, created_by, updated_date, updated_by ) VALUES ( $1, $2, $3, $4, $5, $6, $7, 'Open', $8, $9, $10, CURRENT_TIMESTAMP + INTERVAL '2 hours', CURRENT_TIMESTAMP, $11, CURRENT_TIMESTAMP, $11 ) RETURNING id, slip_number, barcode, customer_name, customer_phone, shipping_address, is_spo, spo_number, status, store_code, outlet_id, created_by_user_id, expired_at, locked_at, paid_at, cancelled_at, created_at, created_by, updated_date, updated_by;",
  insertItem:
    'INSERT INTO e_slip_items ( e_slip_id, sku, item_name, quantity, original_price, discount_price, effective_price, subtotal, created_at, created_by, updated_date, updated_by ) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, CURRENT_TIMESTAMP, $9 ) RETURNING id, e_slip_id, sku, item_name, quantity, original_price, discount_price, effective_price, subtotal, created_at;',
  insertStatusLog:
    "INSERT INTO e_slip_status_logs ( e_slip_id, previous_status, new_status, changed_by, change_source, notes, created_at, created_by, updated_date, updated_by ) VALUES ( $1, NULL, 'Open', $2, 'SALES_APP', 'E-Slip pertama kali dibuat oleh sales', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $2 );",
  slipById:
    'SELECT id, slip_number, barcode, customer_name, customer_phone, shipping_address, is_spo, spo_number, status, store_code, outlet_id, created_by_user_id, expired_at, locked_at, paid_at, cancelled_at, created_at, created_by, updated_date, updated_by FROM e_slips WHERE id = $1 LIMIT 1;',
  slipByNumber:
    'SELECT id, slip_number, barcode, customer_name, customer_phone, shipping_address, is_spo, spo_number, status, store_code, outlet_id, created_by_user_id, expired_at, locked_at, paid_at, cancelled_at, created_at, created_by, updated_date, updated_by FROM e_slips WHERE slip_number = $1 OR barcode = $1 LIMIT 1;',
  slipItems:
    'SELECT id, e_slip_id, sku, item_name, quantity, original_price, discount_price, effective_price, subtotal, created_at FROM e_slip_items WHERE e_slip_id = $1 ORDER BY id ASC;',
  slipLogs:
    'SELECT id, previous_status, new_status, changed_by, change_source, notes, created_at FROM e_slip_status_logs WHERE e_slip_id = $1 ORDER BY created_at ASC;',
};

export function where(...conditions) {
  return `WHERE ${conditions.join(' AND ')}`;
}

export function searchCondition(index) {
  return `( s.slip_number ILIKE $${index} OR s.barcode ILIKE $${index} OR s.customer_name ILIKE $${index} OR s.customer_phone ILIKE $${index} )`;
}

export function countSlipsSql(whereClause) {
  return normalizeSql(`SELECT COUNT(*)::INTEGER as total FROM e_slips s ${whereClause};`);
}

export function listSlipsSql(whereClause, limitIndex) {
  return normalizeSql(
    'SELECT s.id, s.slip_number, s.barcode, s.customer_name, s.customer_phone, s.shipping_address, s.is_spo, s.spo_number, s.status, s.store_code, s.outlet_id, s.created_by_user_id, s.created_by, s.expired_at, s.locked_at, s.paid_at, s.cancelled_at, s.created_at, s.updated_date, COALESCE(SUM(i.quantity), 0)::INTEGER AS total_quantity, COALESCE(COUNT(i.id), 0)::INTEGER AS total_items, COALESCE(SUM(i.subtotal), 0)::NUMERIC AS total_estimated FROM e_slips s LEFT JOIN e_slip_items i ON i.e_slip_id = s.id ' +
      `${whereClause} GROUP BY s.id ORDER BY s.created_at DESC LIMIT $${limitIndex} OFFSET $${limitIndex + 1};`,
  );
}

// Route patterns (matched against normalized SQL).
export const Q = {
  findUserForLogin: /FROM users WHERE username = \$1 OR nik = \$1/,
  findUserByNik: /FROM users WHERE nik = \$1/,
  updateLastLogin: /^UPDATE users SET last_synced_at/,
  count: /^SELECT COUNT\(\*\)/,
  list: /^SELECT s\.id/,
  slipLookup: /FROM e_slips WHERE (id = \$1|slip_number = \$1)/,
  items: /FROM e_slip_items WHERE e_slip_id/,
  logs: /FROM e_slip_status_logs WHERE e_slip_id/,
  lastSlipNumber: /^SELECT slip_number FROM e_slips/,
  insertSlip: /^INSERT INTO e_slips /,
  insertItem: /^INSERT INTO e_slip_items/,
  insertStatusLog: /^INSERT INTO e_slip_status_logs/,
};

// A database row for the authenticated sales user (pg returns BIGINT as string).
export const ACTIVE_USER = {
  id: '1',
  nik: 'SALES-10011-001',
  name: 'Ahmad Fauzi',
  username: 'sales01',
  store_code: 'STORE-10011',
  is_active: true,
  last_synced_at: '2026-10-21T03:00:00.000Z',
};

export const TOKEN = 'eslip-token-SALES-10011-001-1729000000000';

// 2026-10-22 10:00 local time; slip numbers use the Node process local date.
export const FIXED_NOW = new Date(2026, 9, 22, 10, 0, 0).getTime();
export const DATE_PART = '261022';

export function dbError(message, code) {
  const error = new Error(message);
  if (code !== undefined) error.code = code;
  return error;
}
