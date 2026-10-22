import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertErrorLogged, assertJson, useHarness } from './helpers/harness.js';
import { ACTIVE_USER, Q, SERVER_ERROR, TOKEN, dbError } from './helpers/fixtures.js';

const h = useHarness();

const ITEMS = '/api/eslip/v1/items';
const catalog = /FROM \( SELECT DISTINCT ON \(sku\)/;

describe('GET /api/eslip/v1/items', () => {
  it('returns catalog items with numeric prices', async () => {
    h.db(
      [Q.findUserByNik, [ACTIVE_USER]],
      [catalog, [{ sku: 'A', item_name: 'Beras', original_price: '79500.00', discount_price: null, effective_price: '79500.00' }]],
    );
    const res = await h.request('GET', `${ITEMS}?search=ber`, { token: TOKEN });
    assertJson(res, 200, {
      success: true,
      code: 'OK',
      message: 'Daftar item berhasil diambil',
      data: { items: [{ sku: 'A', item_name: 'Beras', original_price: 79500, discount_price: null, effective_price: 79500 }] },
    });
    assert.deepEqual(h.statements[1].params, ['%ber%', 20]);
  });

  it('requires authentication', async () => {
    const res = await h.request('GET', ITEMS);
    assert.equal(res.status, 401);
  });

  it('database error → generic 500', async () => {
    h.db([Q.findUserByNik, [ACTIVE_USER]], [catalog, () => { throw dbError('catalog failed', '42P01'); }]);
    const res = await h.request('GET', ITEMS, { token: TOKEN });
    assertJson(res, 500, SERVER_ERROR);
    assertErrorLogged(h, 'catalog failed');
  });
});
