import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertErrorLogged, assertJson, stmt, useHarness } from './helpers/harness.js';
import { ACTIVE_USER, DATE_PART, FIXED_NOW, Q, SQL, TOKEN, dbError } from './helpers/fixtures.js';

const h = useHarness();

const CREATE = '/api/eslip/v1/slips';
const NIK = ACTIVE_USER.nik;

function money(value) {
  return value === null ? null : Number(value).toFixed(2);
}

// Simulates the rows PostgreSQL returns for the create transaction.
function createRoutes({ user = ACTIVE_USER, lastSlipNumber = [], failOn } = {}) {
  let itemId = 100;
  const fail = (pattern) => (failOn === pattern ? () => { throw dbError('insert failed'); } : null);
  h.db(
    [Q.findUserByNik, [user]],
    [Q.lastSlipNumber, lastSlipNumber],
    [Q.insertSlip, fail(Q.insertSlip) ?? ((p) => [{
      id: '50',
      slip_number: p[0],
      barcode: p[1],
      customer_name: p[2],
      customer_phone: p[3],
      shipping_address: p[4],
      is_spo: p[5],
      spo_number: p[6],
      status: 'Open',
      store_code: p[7],
      outlet_id: p[8],
      created_by_user_id: String(p[9]),
      expired_at: '2026-10-22T05:00:00.000Z',
      locked_at: null,
      paid_at: null,
      cancelled_at: null,
      created_at: '2026-10-22T03:00:00.000Z',
      created_by: p[10],
      updated_date: '2026-10-22T03:00:00.000Z',
      updated_by: p[10],
    }])],
    [Q.insertItem, fail(Q.insertItem) ?? ((p) => [{
      id: String(++itemId),
      e_slip_id: p[0],
      sku: p[1],
      item_name: p[2],
      quantity: p[3],
      original_price: money(p[4]),
      discount_price: money(p[5]),
      effective_price: money(p[6]),
      subtotal: money(p[7]),
      created_at: '2026-10-22T03:00:00.000Z',
    }])],
    [Q.insertStatusLog, fail(Q.insertStatusLog) ?? []],
  );
}

function paramsOf(pattern) {
  return h.statements.filter((s) => pattern.test(s.sql)).map((s) => s.params);
}

const VALID_ITEM = { sku: 'SKU-1', item_name: 'Beras', quantity: 1, original_price: 1000 };
const VALID = { customer_name: 'Budi', items: [VALID_ITEM] };

describe('POST /api/eslip/v1/slips — validation (422, first failure wins)', () => {
  beforeEach(() => h.db([Q.findUserByNik, [ACTIVE_USER]]));

  const item = (overrides) => ({ ...VALID, items: [{ ...VALID_ITEM, ...overrides }] });
  const cases = [
    ['no body', undefined, 'Request body tidak boleh kosong'],
    ['missing customer name', { items: [VALID_ITEM] }, 'Nama customer wajib diisi'],
    ['whitespace customer name', { ...VALID, customer_name: '   ' }, 'Nama customer wajib diisi'],
    ['customer name over 255', { ...VALID, customer_name: 'A'.repeat(256) }, 'Nama customer maksimal 255 karakter'],
    ['phone over 20', { ...VALID, customer_phone: '0'.repeat(21) }, 'Nomor HP customer maksimal 20 karakter'],
    ['is_spo without number', { ...VALID, is_spo: true }, 'Nomor SPO wajib diisi jika transaksi menggunakan SPO'],
    ['is_spo "false" string counts as SPO', { ...VALID, is_spo: 'false' }, 'Nomor SPO wajib diisi jika transaksi menggunakan SPO'],
    ['has_spo without number', { ...VALID, has_spo: true }, 'Nomor SPO wajib diisi jika transaksi menggunakan SPO'],
    ['hasSpo without number', { ...VALID, hasSpo: 1 }, 'Nomor SPO wajib diisi jika transaksi menggunakan SPO'],
    ['is_spo=false overrides has_spo', { customer_name: 'Budi', is_spo: false, has_spo: true, items: [] }, 'E-Slip wajib memiliki minimal 1 item produk'],
    ['spo number over 50 even when not SPO', { ...VALID, spo_number: 'S'.repeat(51) }, 'Nomor SPO maksimal 50 karakter'],
    ['items missing', { customer_name: 'Budi' }, 'E-Slip wajib memiliki minimal 1 item produk'],
    ['items not an array', { customer_name: 'Budi', items: { 0: VALID_ITEM } }, 'E-Slip wajib memiliki minimal 1 item produk'],
    ['items empty', { customer_name: 'Budi', items: [] }, 'E-Slip wajib memiliki minimal 1 item produk'],
    ['customer checked before items', { items: [] }, 'Nama customer wajib diisi'],
    ['item is null', { customer_name: 'Budi', items: [null] }, 'Item baris ke-1 tidak valid'],
    ['second item not an object', { customer_name: 'Budi', items: [VALID_ITEM, 'x'] }, 'Item baris ke-2 tidak valid'],
    ['sku missing', item({ sku: '' }), 'SKU pada item ke-1 wajib diisi'],
    ['sku over 50', item({ sku: 'S'.repeat(51) }), 'SKU pada item ke-1 maksimal 50 karakter'],
    ['item name missing', item({ item_name: '  ' }), 'Nama produk pada item ke-1 wajib diisi'],
    ['item name over 255', item({ item_name: 'N'.repeat(256) }), 'Nama produk pada item ke-1 maksimal 255 karakter'],
    ['quantity zero', item({ quantity: 0 }), 'Quantity pada item ke-1 harus berupa bilangan bulat positif'],
    ['quantity negative', item({ quantity: -1 }), 'Quantity pada item ke-1 harus berupa bilangan bulat positif'],
    ['quantity not numeric', item({ quantity: 'abc' }), 'Quantity pada item ke-1 harus berupa bilangan bulat positif'],
    ['original price missing', item({ original_price: undefined }), 'Harga asli pada item ke-1 harus berupa angka >= 0'],
    ['original price negative', item({ original_price: -1 }), 'Harga asli pada item ke-1 harus berupa angka >= 0'],
    ['discount negative', item({ discount_price: -1 }), 'Harga diskon pada item ke-1 harus berupa angka >= 0'],
    ['discount not numeric', item({ discount_price: 'abc' }), 'Harga diskon pada item ke-1 harus berupa angka >= 0'],
    ['discount above original', item({ discount_price: 1001 }), 'Harga diskon pada item ke-1 tidak boleh lebih besar dari harga asli'],
    ['error reported on the failing item', { customer_name: 'Budi', items: [VALID_ITEM, { ...VALID_ITEM, sku: '' }] }, 'SKU pada item ke-2 wajib diisi'],
  ];

  for (const [name, body, message] of cases) {
    it(`${name} → ${message}`, async () => {
      const res = await h.request('POST', CREATE, { token: TOKEN, body });
      assertJson(res, 422, { success: false, code: 'VALIDATION_ERROR', message, data: null });
      assert.deepEqual(h.statements, [stmt('pool', SQL.findUserByNik, [NIK])]);
      assert.deepEqual(h.logs, []);
    });
  }

  it('non-string customer name crashes with 500 (TypeError message)', async () => {
    const res = await h.request('POST', CREATE, { token: TOKEN, body: { ...VALID, customer_name: 123 } });
    assertJson(res, 500, {
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: '(body.customer_name || body.customerName || body.customer || "").trim is not a function',
      data: null,
    });
  });
});

describe('POST /api/eslip/v1/slips — successful create', () => {
  it('runs the full transaction and returns 201 with the created slip', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
    createRoutes({ lastSlipNumber: [{ slip_number: `10011${DATE_PART}000041` }] });
    const res = await h.request('POST', CREATE, {
      token: TOKEN,
      body: {
        customer_name: '  Budi Santoso  ',
        customer_phone: ' 081234567890 ',
        shipping_address: ' Jl. Cempaka Putih Raya No. 45 ',
        is_spo: true,
        spo_number: ' SPO-ERP-2026-X091 ',
        items: [
          { sku: ' SKU-TV-LG-43 ', item_name: ' LG Smart TV 43 ', quantity: 2, original_price: 4599000, discount_price: 4299000 },
          { sku: 'SKU-BRKT-WALL', item_name: 'Bracket TV', quantity: '3', original_price: '250000', discount_price: '' },
        ],
      },
    });

    const slipNumber = `10011${DATE_PART}000042`;
    assertJson(res, 201, {
      success: true,
      code: 'CREATED',
      message: 'E-Slip berhasil dibuat',
      data: {
        id: '50',
        slip_number: slipNumber,
        barcode: slipNumber,
        customer_name: 'Budi Santoso',
        customer_phone: '081234567890',
        shipping_address: 'Jl. Cempaka Putih Raya No. 45',
        is_spo: true,
        spo_number: 'SPO-ERP-2026-X091',
        status: 'Open',
        store_code: 'STORE-10011',
        outlet_id: '10011',
        created_by_user_id: '1',
        expired_at: '2026-10-22T05:00:00.000Z',
        total_estimated: 9348000,
        total_items: 2,
        total_quantity: 5,
        items: [
          { id: '101', sku: 'SKU-TV-LG-43', item_name: 'LG Smart TV 43', quantity: 2, original_price: 4599000, discount_price: 4299000, effective_price: 4299000, subtotal: 8598000 },
          { id: '102', sku: 'SKU-BRKT-WALL', item_name: 'Bracket TV', quantity: 3, original_price: 250000, discount_price: null, effective_price: 250000, subtotal: 750000 },
        ],
        created_at: '2026-10-22T03:00:00.000Z',
      },
    });

    const prefix = `10011${DATE_PART}`;
    assert.deepEqual(h.statements, [
      stmt('pool', SQL.findUserByNik, [NIK]),
      stmt('client', 'BEGIN'),
      stmt('client', SQL.advisoryLock, [prefix]),
      stmt('client', SQL.lastSlipNumber, [prefix]),
      stmt('client', SQL.insertSlip, [slipNumber, slipNumber, 'Budi Santoso', '081234567890', 'Jl. Cempaka Putih Raya No. 45', true, 'SPO-ERP-2026-X091', 'STORE-10011', '10011', '1', NIK]),
      stmt('client', SQL.insertItem, ['50', 'SKU-TV-LG-43', 'LG Smart TV 43', 2, 4599000, 4299000, 4299000, 8598000, NIK]),
      stmt('client', SQL.insertItem, ['50', 'SKU-BRKT-WALL', 'Bracket TV', 3, 250000, null, 250000, 750000, NIK]),
      stmt('client', SQL.insertStatusLog, ['50', NIK]),
      stmt('client', 'COMMIT'),
      stmt('client', 'RELEASE'),
    ]);
    assert.deepEqual(h.logs, []);
  });

  it('accepts camelCase and short aliases', async () => {
    createRoutes();
    const res = await h.request('POST', CREATE, {
      token: TOKEN,
      body: {
        customerName: 'Camel',
        phoneNumber: '0811',
        address: 'Jl. Alias',
        hasSpo: true,
        spoNumber: 'SPO-1',
        items: [{ sku: 'A', itemName: 'Camel Item', quantity: 1, originalPrice: 500, discountPrice: 400 }],
      },
    });
    assert.equal(res.status, 201);
    assert.deepEqual(paramsOf(Q.insertSlip)[0].slice(2, 7), ['Camel', '0811', 'Jl. Alias', true, 'SPO-1']);
    assert.deepEqual(paramsOf(Q.insertItem)[0].slice(1, 8), ['A', 'Camel Item', 1, 500, 400, 400, 400]);
  });

  it('uses the remaining aliases (customer, phone, name)', async () => {
    createRoutes();
    await h.request('POST', CREATE, {
      token: TOKEN,
      body: { customer: 'Short', phone: '0812', items: [{ sku: 'B', name: 'Short Item', quantity: 1, original_price: 1 }] },
    });
    assert.deepEqual(paramsOf(Q.insertSlip)[0].slice(2, 7), ['Short', '0812', null, false, null]);
    assert.equal(paramsOf(Q.insertItem)[0][2], 'Short Item');
  });

  it('snake_case wins over aliases, and is_spo wins over has_spo', async () => {
    createRoutes();
    await h.request('POST', CREATE, {
      token: TOKEN,
      body: { customer_name: 'Snake', customerName: 'Camel', is_spo: false, hasSpo: true, spo_number: 'IGNORED', items: [VALID_ITEM] },
    });
    assert.deepEqual(paramsOf(Q.insertSlip)[0].slice(2, 7), ['Snake', null, null, false, null]);
  });

  it('coerces quantity with parseInt and prices with parseFloat', async () => {
    createRoutes();
    await h.request('POST', CREATE, {
      token: TOKEN,
      body: { customer_name: 'Budi', items: [{ sku: 'C', item_name: 'Coerced', quantity: '2.7', original_price: '1000abc', discount_price: null }] },
    });
    assert.deepEqual(paramsOf(Q.insertItem)[0].slice(3, 8), [2, 1000, null, 1000, 2000]);
  });

  it('accepts every field at exactly its maximum length', async () => {
    createRoutes();
    const body = {
      customer_name: 'C'.repeat(255),
      customer_phone: '0'.repeat(20),
      is_spo: true,
      spo_number: 'S'.repeat(50),
      items: [{ sku: 'K'.repeat(50), item_name: 'N'.repeat(255), quantity: 1, original_price: 0, discount_price: 0 }],
    };
    const res = await h.request('POST', CREATE, { token: TOKEN, body });
    assert.equal(res.status, 201);
    assert.deepEqual(paramsOf(Q.insertSlip)[0].slice(2, 7), [body.customer_name, body.customer_phone, null, true, body.spo_number]);
    assert.deepEqual(paramsOf(Q.insertItem)[0].slice(1, 8), ['K'.repeat(50), 'N'.repeat(255), 1, 0, 0, 0, 0]);
  });

  it('rounds subtotals and the total to 2 decimals', async () => {
    createRoutes();
    const res = await h.request('POST', CREATE, {
      token: TOKEN,
      body: { customer_name: 'Budi', items: [{ sku: 'D', item_name: 'Cents', quantity: 3, original_price: 0.1 }] },
    });
    assert.deepEqual(paramsOf(Q.insertItem)[0].slice(4, 8), [0.1, null, 0.1, 0.3]);
    assert.equal(JSON.parse(res.text).data.total_estimated, 0.3);
  });

  const sequenceCases = [
    ['first slip of the day', [], '000001'],
    ['continues the last sequence', [{ slip_number: `10011${DATE_PART}000099` }], '000100'],
    ['unparseable last sequence restarts at 1', [{ slip_number: `10011${DATE_PART}abcdef` }], '000001'],
    ['null last slip number restarts at 1', [{ slip_number: null }], '000001'],
  ];
  for (const [name, lastSlipNumber, sequence] of sequenceCases) {
    it(`slip number: ${name}`, async (t) => {
      t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
      createRoutes({ lastSlipNumber });
      await h.request('POST', CREATE, { token: TOKEN, body: VALID });
      const [slipNumber, barcode] = paramsOf(Q.insertSlip)[0];
      assert.equal(slipNumber, `10011${DATE_PART}${sequence}`);
      assert.equal(barcode, slipNumber);
    });
  }

  const outletCases = [
    ['STORE-10011', '10011'],
    ['TOKO-7', '00007'],
    ['1234567', '34567'],
    ['X12-345', '00012'],
    ['NO-DIGITS', '10011'],
  ];
  for (const [storeCode, outlet] of outletCases) {
    it(`store_code ${storeCode} → outlet ${outlet} in slip number and row`, async (t) => {
      t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
      createRoutes({ user: { ...ACTIVE_USER, store_code: storeCode } });
      await h.request('POST', CREATE, { token: TOKEN, body: VALID });
      assert.deepEqual(paramsOf(/^SELECT pg_advisory_xact_lock/)[0], [`${outlet}${DATE_PART}`]);
      const insert = paramsOf(Q.insertSlip)[0];
      assert.equal(insert[7], storeCode);
      assert.equal(insert[8], outlet);
    });
  }
});

describe('POST /api/eslip/v1/slips — database failure', () => {
  for (const [name, failOn, inserted] of [
    ['slip header insert', Q.insertSlip, 0],
    ['item insert', Q.insertItem, 1],
    ['status log insert', Q.insertStatusLog, 3],
  ]) {
    it(`failure on ${name} rolls back, releases the client and returns 500`, async () => {
      createRoutes({ failOn });
      const res = await h.request('POST', CREATE, {
        token: TOKEN,
        body: { customer_name: 'Budi', items: [VALID_ITEM, VALID_ITEM] },
      });
      assertJson(res, 500, { success: false, code: 'INTERNAL_SERVER_ERROR', message: 'insert failed', data: null });
      assertErrorLogged(h, 'insert failed');
      const sqls = h.statements.map((s) => s.sql);
      assert.equal(sqls.filter((sql) => /^INSERT/.test(sql)).length, inserted + 1);
      assert.deepEqual(sqls.slice(-2), ['ROLLBACK', 'RELEASE']);
      assert.ok(!sqls.includes('COMMIT'));
    });
  }
});
