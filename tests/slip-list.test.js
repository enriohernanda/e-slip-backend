import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertErrorLogged, assertJson, stmt, useHarness } from './helpers/harness.js';
import { ACTIVE_USER, Q, SQL, TOKEN, countSlipsSql, dbError, listSlipsSql, searchCondition, where } from './helpers/fixtures.js';

const h = useHarness();

const LIST = '/api/eslip/v1/slips';
const NIK = ACTIVE_USER.nik;
const STORE = 'STORE-10011';
const byStore = 's.store_code = $1';

function list(query = '', { total = [], rows = [] } = {}) {
  h.db([Q.findUserByNik, [ACTIVE_USER]], [Q.count, total], [Q.list, rows]);
  return h.request('GET', `${LIST}${query}`, { token: TOKEN });
}

function expectQueries(whereClause, params, limitIndex) {
  assert.deepEqual(h.statements, [
    stmt('pool', SQL.findUserByNik, [NIK]),
    stmt('pool', SQL.expireSlips),
    stmt('pool', countSlipsSql(whereClause), params.slice(0, limitIndex - 1)),
    stmt('pool', listSlipsSql(whereClause, limitIndex), params),
  ]);
}

describe('GET /api/eslip/v1/slips — query building', () => {
  it('defaults: store scope only, page 1, limit 10; expire runs before count and select', async () => {
    const res = await list();
    assertJson(res, 200, {
      success: true,
      code: 'OK',
      message: 'Daftar E-Slip berhasil diambil',
      data: { slips: [], pagination: { total_records: 0, page: 1, limit: 10, total_pages: 1 } },
    });
    expectQueries(where(byStore), [STORE, 10, 0], 2);
  });

  const paging = [
    ['?page=3&limit=20', 3, 20],
    ['?page=0', 1, 10],
    ['?page=-5', 1, 10],
    ['?page=abc', 1, 10],
    ['?page=2.9', 2, 10],
    ['?limit=500', 1, 100],
    ['?limit=0', 1, 10],
    ['?limit=-3', 1, 1],
    ['?limit=abc', 1, 10],
  ];
  for (const [query, page, limit] of paging) {
    it(`paging ${query} → page ${page}, limit ${limit}`, async () => {
      const res = await list(query);
      const { pagination } = JSON.parse(res.text).data;
      assert.deepEqual(pagination, { total_records: 0, page, limit, total_pages: 1 });
      expectQueries(where(byStore), [STORE, limit, (page - 1) * limit], 2);
    });
  }

  it('total_pages is ceil(total / limit)', async () => {
    const res = await list('?limit=10', { total: [{ total: 45 }] });
    assert.deepEqual(JSON.parse(res.text).data.pagination, { total_records: 45, page: 1, limit: 10, total_pages: 5 });
  });

  it('status is trimmed', async () => {
    await list('?status=%20Open%20');
    expectQueries(where(byStore, 's.status = $2'), [STORE, 'Open', 10, 0], 3);
  });

  it('blank status is ignored', async () => {
    await list('?status=%20%20');
    expectQueries(where(byStore), [STORE, 10, 0], 2);
  });

  it('search is trimmed and wrapped in % across four columns with one parameter', async () => {
    await list('?search=%20bud%20');
    expectQueries(where(byStore, searchCondition(2)), [STORE, '%bud%', 10, 0], 3);
  });

  for (const [value, expected] of [['true', true], ['false', false], ['yes', false]]) {
    it(`is_spo=${value} filters is_spo = ${expected}`, async () => {
      await list(`?is_spo=${value}`);
      expectQueries(where(byStore, 's.is_spo = $2'), [STORE, expected, 10, 0], 3);
    });
  }

  it('empty is_spo is ignored', async () => {
    await list('?is_spo=');
    expectQueries(where(byStore), [STORE, 10, 0], 2);
  });

  it('created_by_me=true filters by the caller NIK and wins over created_by', async () => {
    await list('?created_by_me=true&created_by=OTHER');
    expectQueries(where(byStore, 's.created_by = $2'), [STORE, NIK, 10, 0], 3);
  });

  it('created_by filters by any NIK', async () => {
    await list('?created_by=OTHER');
    expectQueries(where(byStore, 's.created_by = $2'), [STORE, 'OTHER', 10, 0], 3);
  });

  it('created_by_me other than "true" is ignored', async () => {
    await list('?created_by_me=1');
    expectQueries(where(byStore), [STORE, 10, 0], 2);
  });

  it('combines filters in fixed order with sequential parameters', async () => {
    await list('?search=q&created_by=X&is_spo=true&status=Paid&page=2&limit=5');
    expectQueries(
      where(byStore, 's.status = $2', 's.is_spo = $3', 's.created_by = $4', searchCondition(5)),
      [STORE, 'Paid', true, 'X', '%q%', 5, 5],
      6,
    );
  });

  for (const param of ['status', 'search']) {
    it(`repeated ${param} parameter crashes with 500 before any slip query`, async () => {
      const res = await list(`?${param}=a&${param}=b`);
      const message = `queryParams.${param}.trim is not a function`;
      assertJson(res, 500, { success: false, code: 'INTERNAL_SERVER_ERROR', message, data: null });
      assertErrorLogged(h, message);
      assert.deepEqual(h.statements, [stmt('pool', SQL.findUserByNik, [NIK])]);
    });
  }

  it('database error → 500', async () => {
    h.db([Q.findUserByNik, [ACTIVE_USER]], [Q.list, () => { throw dbError('list failed'); }]);
    const res = await h.request('GET', LIST, { token: TOKEN });
    assertJson(res, 500, { success: false, code: 'INTERNAL_SERVER_ERROR', message: 'list failed', data: null });
  });
});

describe('GET /api/eslip/v1/slips — response mapping', () => {
  it('maps rows with aliases, numeric parsing and rounding', async () => {
    const row = {
      id: '5',
      slip_number: '10011261020000003',
      barcode: '10011261020000003',
      customer_name: 'Dedy',
      customer_phone: '081122334455',
      shipping_address: 'Jl. Bintaro',
      is_spo: false,
      spo_number: null,
      status: 'Open',
      store_code: STORE,
      outlet_id: '10011',
      created_by_user_id: '1',
      created_by: NIK,
      expired_at: '2026-10-22T05:00:00.000Z',
      locked_at: null,
      paid_at: null,
      cancelled_at: null,
      created_at: '2026-10-22T03:00:00.000Z',
      updated_date: '2026-10-22T03:30:00.000Z',
      total_quantity: 9,
      total_items: 3,
      total_estimated: '100.005',
    };
    const sparse = { id: '6', total_quantity: null, total_items: null, total_estimated: null };
    const res = await list('', { total: [{ total: 2 }], rows: [row, sparse] });
    assertJson(res, 200, {
      success: true,
      code: 'OK',
      message: 'Daftar E-Slip berhasil diambil',
      data: {
        slips: [
          {
            id: '5',
            slip_number: '10011261020000003',
            barcode: '10011261020000003',
            customer_name: 'Dedy',
            customer_phone: '081122334455',
            customer: 'Dedy',
            shipping_address: 'Jl. Bintaro',
            is_spo: false,
            spo_number: null,
            status: 'Open',
            store_code: STORE,
            outlet_id: '10011',
            created_by_user_id: '1',
            created_by: NIK,
            expired_at: '2026-10-22T05:00:00.000Z',
            locked_at: null,
            paid_at: null,
            cancelled_at: null,
            total_items: 3,
            total_quantity: 9,
            total_estimated: 100.01,
            total: 100.01,
            created_at: '2026-10-22T03:00:00.000Z',
            updated_date: '2026-10-22T03:30:00.000Z',
          },
          { id: '6', total_items: 0, total_quantity: 0, total_estimated: 0, total: 0 },
        ],
        pagination: { total_records: 2, page: 1, limit: 10, total_pages: 1 },
      },
    });
  });
});
