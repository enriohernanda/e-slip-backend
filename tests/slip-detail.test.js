import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertJson, stmt, useHarness } from './helpers/harness.js';
import { ACTIVE_USER, Q, SQL, TOKEN, dbError } from './helpers/fixtures.js';

const h = useHarness();

const NIK = ACTIVE_USER.nik;
const STORE = 'STORE-10011';

const slipRow = {
  id: '9',
  slip_number: '10011261022000009',
  barcode: '10011261022000009',
  customer_name: 'Ibu Ratna',
  customer_phone: '081398765432',
  shipping_address: 'Apartemen Green Pramuka',
  is_spo: true,
  spo_number: 'SPO-1',
  status: 'Locked',
  store_code: STORE,
  outlet_id: '10011',
  created_by_user_id: '2',
  expired_at: '2026-10-22T05:00:00.000Z',
  locked_at: '2026-10-22T04:00:00.000Z',
  paid_at: null,
  cancelled_at: null,
  created_at: '2026-10-22T03:00:00.000Z',
  created_by: 'SALES-10011-002',
  updated_date: '2026-10-22T04:00:00.000Z',
  updated_by: 'POS-CASHIER-02',
};

const itemRows = [
  { id: '1', e_slip_id: '9', sku: 'A', item_name: 'Kulkas', quantity: 2, original_price: '10.00', discount_price: null, effective_price: '10.00', subtotal: '20.00', created_at: '2026-10-22T03:00:00.000Z' },
  { id: '2', e_slip_id: '9', sku: 'B', item_name: 'Kabel', quantity: 3, original_price: '5.50', discount_price: '5.00', effective_price: '5.00', subtotal: '15.00', created_at: '2026-10-22T03:00:01.000Z' },
];

const logRows = [
  { id: '1', previous_status: null, new_status: 'Open', changed_by: 'SALES-10011-002', change_source: 'SALES_APP', notes: 'dibuat', created_at: '2026-10-22T03:00:00.000Z' },
  { id: '2', previous_status: 'Open', new_status: 'Locked', changed_by: 'KASIR-002', change_source: 'POS', notes: null, created_at: '2026-10-22T04:00:00.000Z' },
];

function detail(identifier, { slip = [slipRow], items = itemRows, logs = logRows, user = ACTIVE_USER } = {}) {
  h.db([Q.findUserByNik, [user]], [Q.slipLookup, slip], [Q.items, items], [Q.logs, logs]);
  return h.request('GET', `/api/eslip/v1/slips/${identifier}`, { token: TOKEN });
}

describe('GET /api/eslip/v1/slips/:id — lookup', () => {
  const lookups = [
    ['9', SQL.slipById],
    ['123456789', SQL.slipById],
    ['1234567890', SQL.slipByNumber],
    ['10011261022000009', SQL.slipByNumber],
    ['ABC-1', SQL.slipByNumber],
  ];
  for (const [identifier, sql] of lookups) {
    it(`identifier ${identifier} uses ${sql === SQL.slipById ? 'id' : 'slip_number/barcode'} lookup`, async () => {
      await detail(identifier);
      assert.deepEqual(h.statements, [
        stmt('pool', SQL.findUserByNik, [NIK]),
        stmt('pool', SQL.expireSlips),
        stmt('pool', sql, [identifier]),
        stmt('pool', SQL.slipItems, ['9']),
        stmt('pool', SQL.slipLogs, ['9']),
      ]);
    });
  }

  it('not found → 404 after the lookup only', async () => {
    const res = await detail('404', { slip: [] });
    assertJson(res, 404, {
      success: false,
      code: 'NOT_FOUND',
      message: "E-Slip dengan identifier '404' tidak ditemukan",
      data: null,
    });
    assert.deepEqual(h.statements, [
      stmt('pool', SQL.findUserByNik, [NIK]),
      stmt('pool', SQL.expireSlips),
      stmt('pool', SQL.slipById, ['404']),
    ]);
  });

  it('slip from another store → 403 (items and logs already loaded)', async () => {
    const res = await detail('9', { slip: [{ ...slipRow, store_code: 'STORE-10012' }] });
    assertJson(res, 403, {
      success: false,
      code: 'FORBIDDEN',
      message: 'Akses ditolak: E-Slip ini milik outlet/toko lain',
      data: null,
    });
    assert.equal(h.statements.length, 5);
  });

  it('database error → 500', async () => {
    h.db([Q.findUserByNik, [ACTIVE_USER]], [Q.slipLookup, () => { throw dbError('lookup failed', '57P01'); }]);
    const res = await h.request('GET', '/api/eslip/v1/slips/9', { token: TOKEN });
    assertJson(res, 500, { success: false, code: '57P01', message: 'lookup failed', data: null });
  });
});

describe('GET /api/eslip/v1/slips/:id — response mapping', () => {
  it('returns the full detail with totals computed from items', async () => {
    const res = await detail('9');
    assertJson(res, 200, {
      success: true,
      code: 'OK',
      message: 'Detail E-Slip berhasil diambil',
      data: {
        id: '9',
        slip_number: '10011261022000009',
        barcode: '10011261022000009',
        customer_name: 'Ibu Ratna',
        customer_phone: '081398765432',
        customer: 'Ibu Ratna',
        shipping_address: 'Apartemen Green Pramuka',
        is_spo: true,
        spo_number: 'SPO-1',
        status: 'Locked',
        store_code: STORE,
        outlet_id: '10011',
        created_by_user_id: '2',
        created_by: 'SALES-10011-002',
        expired_at: '2026-10-22T05:00:00.000Z',
        locked_at: '2026-10-22T04:00:00.000Z',
        paid_at: null,
        cancelled_at: null,
        total_estimated: 35,
        total: 35,
        total_items: 2,
        total_quantity: 5,
        items: [
          { id: '1', sku: 'A', item_name: 'Kulkas', quantity: 2, original_price: 10, discount_price: null, effective_price: 10, subtotal: 20, created_at: '2026-10-22T03:00:00.000Z' },
          { id: '2', sku: 'B', item_name: 'Kabel', quantity: 3, original_price: 5.5, discount_price: 5, effective_price: 5, subtotal: 15, created_at: '2026-10-22T03:00:01.000Z' },
        ],
        status_logs: [
          { id: '1', previous_status: null, new_status: 'Open', changed_by: 'SALES-10011-002', change_source: 'SALES_APP', notes: 'dibuat', created_at: '2026-10-22T03:00:00.000Z' },
          { id: '2', previous_status: 'Open', new_status: 'Locked', changed_by: 'KASIR-002', change_source: 'POS', notes: null, created_at: '2026-10-22T04:00:00.000Z' },
        ],
        created_at: '2026-10-22T03:00:00.000Z',
        updated_date: '2026-10-22T04:00:00.000Z',
      },
    });
  });

  it('a slip without items or logs has zero totals and empty arrays', async () => {
    const res = await detail('9', { items: [], logs: [] });
    const data = JSON.parse(res.text).data;
    assert.equal(data.total_estimated, 0);
    assert.equal(data.total, 0);
    assert.equal(data.total_items, 0);
    assert.equal(data.total_quantity, 0);
    assert.deepEqual(data.items, []);
    assert.deepEqual(data.status_logs, []);
  });

  it('rounds the summed subtotal to 2 decimals', async () => {
    const res = await detail('9', {
      items: [
        { ...itemRows[0], subtotal: '0.10' },
        { ...itemRows[1], subtotal: '0.20' },
      ],
    });
    assert.equal(JSON.parse(res.text).data.total_estimated, 0.3);
  });
});
