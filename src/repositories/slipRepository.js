import * as db from '../config/db.js';
import { toWibDateCode } from '../utils/dateTime.js';

// Format: [outlet 5][YYMMDD WIB][seq 6], contoh 10011261021000001
async function generateSlipNumber(client, outletId) {
  const datePart = toWibDateCode(new Date());

  const cleanOutlet = String(outletId || '10011').padStart(5, '0').slice(-5);
  const prefix = `${cleanOutlet}${datePart}`;

  // Advisory lock per prefix agar request paralel tidak mendapat sequence yang sama
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1));', [prefix]);

  const query = `
    SELECT slip_number 
    FROM e_slips 
    WHERE slip_number LIKE $1 || '%' 
    ORDER BY slip_number DESC 
    LIMIT 1;
  `;
  const { rows } = await client.query(query, [prefix]);

  let nextSeq = 1;
  if (rows.length > 0 && rows[0].slip_number) {
    const lastSlipNumber = rows[0].slip_number;
    const lastSeqStr = lastSlipNumber.slice(prefix.length);
    const parsedSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(parsedSeq)) {
      nextSeq = parsedSeq + 1;
    }
  }

  const paddedSeq = String(nextSeq).padStart(6, '0');
  return `${prefix}${paddedSeq}`;
}

export async function createSlipWithTransaction(slipData, items, user) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const slipNumber = await generateSlipNumber(client, user.outlet_id);
    const barcode = slipNumber; // Sesuai spesifikasi ERD: barcode = slip_number pada MVP

    const insertSlipQuery = `
      INSERT INTO e_slips (
        slip_number,
        barcode,
        customer_name,
        customer_phone,
        shipping_address,
        is_spo,
        spo_number,
        status,
        store_code,
        outlet_id,
        created_by_user_id,
        expired_at,
        created_at,
        created_by,
        updated_date,
        updated_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'Open', $8, $9, $10,
        CURRENT_TIMESTAMP + INTERVAL '2 hours',
        CURRENT_TIMESTAMP, $11, CURRENT_TIMESTAMP, $11
      )
      RETURNING 
        id, slip_number, barcode, customer_name, customer_phone, shipping_address,
        is_spo, spo_number, status, store_code, outlet_id, created_by_user_id,
        expired_at, locked_at, paid_at, cancelled_at, created_at, created_by, updated_date, updated_by;
    `;

    const slipValues = [
      slipNumber,
      barcode,
      slipData.customer_name,
      slipData.customer_phone,
      slipData.shipping_address,
      slipData.is_spo,
      slipData.spo_number,
      user.store_code,
      user.outlet_id,
      user.id,
      user.nik,
    ];

    const { rows: slipRows } = await client.query(insertSlipQuery, slipValues);
    const createdSlip = slipRows[0];

    const insertedItems = [];
    for (const item of items) {
      const insertItemQuery = `
        INSERT INTO e_slip_items (
          e_slip_id,
          sku,
          item_name,
          quantity,
          original_price,
          discount_price,
          effective_price,
          subtotal,
          created_at,
          created_by,
          updated_date,
          updated_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          CURRENT_TIMESTAMP, $9, CURRENT_TIMESTAMP, $9
        )
        RETURNING 
          id, e_slip_id, sku, item_name, quantity, original_price, discount_price, effective_price, subtotal, created_at;
      `;

      const itemValues = [
        createdSlip.id,
        item.sku,
        item.item_name,
        item.quantity,
        item.original_price,
        item.discount_price,
        item.effective_price,
        item.subtotal,
        user.nik,
      ];

      const { rows: itemRows } = await client.query(insertItemQuery, itemValues);
      insertedItems.push(itemRows[0]);
    }

    const insertLogQuery = `
      INSERT INTO e_slip_status_logs (
        e_slip_id,
        previous_status,
        new_status,
        changed_by,
        change_source,
        notes,
        created_at,
        created_by,
        updated_date,
        updated_by
      )
      VALUES (
        $1, NULL, 'Open', $2, 'SALES_APP', 'E-Slip pertama kali dibuat oleh sales',
        CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $2
      );
    `;

    await client.query(insertLogQuery, [createdSlip.id, user.nik]);

    await client.query('COMMIT');

    return {
      ...createdSlip,
      items: insertedItems,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function expireTimeoutSlips() {
  const query = `
    UPDATE e_slips
    SET status = 'Expired', updated_date = CURRENT_TIMESTAMP, updated_by = 'SYSTEM_TIMEOUT'
    WHERE status = 'Open' AND expired_at < CURRENT_TIMESTAMP;
  `;
  await db.query(query);
}

function buildSlipFilters({ store_code, status, search, is_spo, created_by }) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (store_code) {
    conditions.push(`s.store_code = $${paramIndex++}`);
    values.push(store_code);
  }

  if (status) {
    conditions.push(`s.status = $${paramIndex++}`);
    values.push(status);
  }

  if (is_spo !== undefined && is_spo !== null && is_spo !== '') {
    conditions.push(`s.is_spo = $${paramIndex++}`);
    values.push(is_spo === 'true' || is_spo === true);
  }

  if (created_by) {
    conditions.push(`s.created_by = $${paramIndex++}`);
    values.push(created_by);
  }

  if (search) {
    conditions.push(`(
      s.slip_number ILIKE $${paramIndex} OR 
      s.barcode ILIKE $${paramIndex} OR 
      s.customer_name ILIKE $${paramIndex} OR 
      s.customer_phone ILIKE $${paramIndex}
    )`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return { whereClause, values, nextParamIndex: paramIndex };
}

export async function findSlips(filters = {}) {
  await expireTimeoutSlips();

  const { limit = 10, offset = 0 } = filters;
  const { whereClause, values, nextParamIndex } = buildSlipFilters(filters);

  const query = `
    SELECT 
      s.id,
      s.slip_number,
      s.barcode,
      s.customer_name,
      s.customer_phone,
      s.shipping_address,
      s.is_spo,
      s.spo_number,
      s.status,
      s.store_code,
      s.outlet_id,
      s.created_by_user_id,
      s.created_by,
      s.expired_at,
      s.locked_at,
      s.paid_at,
      s.cancelled_at,
      s.created_at,
      s.updated_date,
      COALESCE(SUM(i.quantity), 0)::INTEGER AS total_quantity,
      COALESCE(COUNT(i.id), 0)::INTEGER AS total_items,
      COALESCE(SUM(i.subtotal), 0)::NUMERIC AS total_estimated
    FROM e_slips s
    LEFT JOIN e_slip_items i ON i.e_slip_id = s.id
    ${whereClause}
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1};
  `;

  values.push(limit, offset);

  const { rows } = await db.query(query, values);
  return rows;
}

export async function countSlips(filters = {}) {
  const { whereClause, values } = buildSlipFilters(filters);
  const countQuery = `SELECT COUNT(*)::INTEGER as total FROM e_slips s ${whereClause};`;
  const { rows } = await db.query(countQuery, values);
  return rows[0] ? rows[0].total : 0;
}

export async function findByIdOrSlipNumber(identifier) {
  await expireTimeoutSlips();

  const isNumeric = /^\d+$/.test(String(identifier));
  let slipQuery = '';
  const values = [identifier];

  if (isNumeric && String(identifier).length < 10) {
    slipQuery = `
      SELECT 
        id, slip_number, barcode, customer_name, customer_phone, shipping_address,
        is_spo, spo_number, status, store_code, outlet_id, created_by_user_id,
        expired_at, locked_at, paid_at, cancelled_at, created_at, created_by, updated_date, updated_by
      FROM e_slips
      WHERE id = $1
      LIMIT 1;
    `;
  } else {
    slipQuery = `
      SELECT 
        id, slip_number, barcode, customer_name, customer_phone, shipping_address,
        is_spo, spo_number, status, store_code, outlet_id, created_by_user_id,
        expired_at, locked_at, paid_at, cancelled_at, created_at, created_by, updated_date, updated_by
      FROM e_slips
      WHERE slip_number = $1 OR barcode = $1
      LIMIT 1;
    `;
  }

  const { rows: slipRows } = await db.query(slipQuery, values);
  if (slipRows.length === 0) return null;

  const slip = slipRows[0];

  const itemsQuery = `
    SELECT 
      id, e_slip_id, sku, item_name, quantity, original_price, discount_price, effective_price, subtotal, created_at
    FROM e_slip_items
    WHERE e_slip_id = $1
    ORDER BY id ASC;
  `;
  const { rows: itemRows } = await db.query(itemsQuery, [slip.id]);

  const logsQuery = `
    SELECT 
      id, previous_status, new_status, changed_by, change_source, notes, created_at
    FROM e_slip_status_logs
    WHERE e_slip_id = $1
    ORDER BY created_at ASC;
  `;
  const { rows: logRows } = await db.query(logsQuery, [slip.id]);

  return {
    ...slip,
    items: itemRows,
    status_logs: logRows,
  };
}

export async function findById(id) {
  return findByIdOrSlipNumber(id);
}
