// Modules (and functions) that no route uses today. They are kept by decision D2,
// so their current behavior is pinned here to guard the ES Modules conversion.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { stmt, useHarness } from './helpers/harness.mjs';
import { loadModule } from './helpers/loader.mjs';
import { FIXED_NOW, SQL } from './helpers/fixtures.mjs';

const h = useHarness();

describe('utils/hcmClient — mock mode (USE_MOCK_HCM not "false")', () => {
  it('authenticates a mock user by username and logs the attempt', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
    const log = t.mock.method(console, 'log', () => {});
    const hcmClient = await loadModule('utils/hcmClient.js');
    const result = await hcmClient.authenticate('aryan', 'password111');
    assert.deepEqual(result, {
      external_user_id: 'HCM-101',
      nik: '1002345',
      name: 'Aryan Fitrah',
      email: 'aryan@gmail.com',
      outlet_id: 'OUT-JKT-01',
      role: 'sales',
      is_active: true,
      token: `hcm-mock-token-1002345-${FIXED_NOW}`,
    });
    assert.deepEqual(log.mock.calls.map((c) => c.arguments), [
      ['[HCM Client Mock] Menerima request login untuk username: aryan'],
    ]);
  });

  it('accepts a NIK as the username', async (t) => {
    t.mock.method(console, 'log', () => {});
    const hcmClient = await loadModule('utils/hcmClient.js');
    const result = await hcmClient.authenticate('1002346', 'password222');
    assert.equal(result.name, 'Arnold Pramudita');
  });

  it('rejects wrong credentials with 401 UNAUTHORIZED', async (t) => {
    t.mock.method(console, 'log', () => {});
    const hcmClient = await loadModule('utils/hcmClient.js');
    await assert.rejects(hcmClient.authenticate('aryan', 'nope'), (error) => {
      assert.equal(error.message, 'Kredensial tidak valid di HCM (Username atau password salah)');
      assert.equal(error.statusCode, 401);
      assert.equal(error.code, 'UNAUTHORIZED');
      return true;
    });
  });
});

describe('utils/hcmClient — remote mode (USE_MOCK_HCM="false")', () => {
  let server;
  let baseUrl;
  const received = [];
  const saved = {};

  before(async () => {
    server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', () => {
        received.push({ method: req.method, url: req.url, type: req.headers['content-type'], body: JSON.parse(raw) });
        const ok = JSON.parse(raw).username === 'remote-ok';
        res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
        res.end(JSON.stringify(ok ? { token: 'remote-token', nik: '777' } : { message: 'Ditolak oleh HCM' }));
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    for (const key of ['USE_MOCK_HCM', 'HCM_API_BASE_URL']) saved[key] = process.env[key];
    process.env.USE_MOCK_HCM = 'false';
  });

  after(async () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await new Promise((resolve) => server.close(resolve));
  });

  it('POSTs credentials as JSON to {HCM_API_BASE_URL}/auth/login and returns the body', async () => {
    process.env.HCM_API_BASE_URL = baseUrl;
    const hcmClient = await loadModule('utils/hcmClient.js');
    const result = await hcmClient.authenticate('remote-ok', 'pw');
    assert.deepEqual(result, { token: 'remote-token', nik: '777' });
    assert.deepEqual(received.at(-1), {
      method: 'POST',
      url: '/auth/login',
      type: 'application/json',
      body: { username: 'remote-ok', password: 'pw' },
    });
  });

  it('maps an HCM error response to HCM_GATEWAY_ERROR with its status and message', async () => {
    process.env.HCM_API_BASE_URL = baseUrl;
    const hcmClient = await loadModule('utils/hcmClient.js');
    await assert.rejects(hcmClient.authenticate('someone', 'pw'), (error) => {
      assert.equal(error.message, 'Ditolak oleh HCM');
      assert.equal(error.statusCode, 401);
      assert.equal(error.code, 'HCM_GATEWAY_ERROR');
      return true;
    });
  });

  it('maps an unreachable HCM to 502 with the default message', async () => {
    process.env.HCM_API_BASE_URL = 'http://127.0.0.1:1';
    const hcmClient = await loadModule('utils/hcmClient.js');
    await assert.rejects(hcmClient.authenticate('someone', 'pw'), (error) => {
      assert.equal(error.message, 'Gagal berkomunikasi dengan server HCM eksternal');
      assert.equal(error.statusCode, 502);
      assert.equal(error.code, 'HCM_GATEWAY_ERROR');
      return true;
    });
  });
});

describe('utils/helper', () => {
  it('formatDate returns an ISO string', async () => {
    const helper = await loadModule('utils/helper.js');
    assert.equal(helper.formatDate('2026-10-22T03:00:00Z'), '2026-10-22T03:00:00.000Z');
    assert.throws(() => helper.formatDate('not a date'), RangeError);
  });
});

describe('repositories — functions without a route', () => {
  it('userRepository.findById returns the row or null', async () => {
    const userRepository = await loadModule('repositories/userRepository.js');
    h.db([/WHERE id = \$1/, (params) => (params[0] === '7' ? [{ id: '7' }] : [])]);
    assert.deepEqual(await userRepository.findById('7'), { id: '7' });
    assert.equal(await userRepository.findById('8'), null);
    assert.deepEqual(h.statements, [stmt('pool', SQL.findUserById, ['7']), stmt('pool', SQL.findUserById, ['8'])]);
  });

  it('userRepository.upsertUser applies its defaults', async () => {
    const userRepository = await loadModule('repositories/userRepository.js');
    h.db([/^INSERT INTO users/, [{ id: '3' }]]);
    assert.deepEqual(await userRepository.upsertUser({ nik: 'N1', name: 'Nama' }), { id: '3' });
    await userRepository.upsertUser({ nik: 'N2', name: 'Dua', username: 'u2', password: 'p', outlet_id: 'OUT-1', is_active: false });
    await userRepository.upsertUser({ nik: 'N3', name: 'Tiga', store_code: 'STORE-1', outlet_id: 'OUT-1' });
    assert.deepEqual(h.statements, [
      stmt('pool', SQL.upsertUser, ['N1', 'Nama', 'N1', '', 'STORE-10011', true]),
      stmt('pool', SQL.upsertUser, ['N2', 'Dua', 'u2', 'p', 'OUT-1', false]),
      stmt('pool', SQL.upsertUser, ['N3', 'Tiga', 'N3', '', 'STORE-1', true]),
    ]);
  });

  it('userRepository.getAllUsers returns every row', async () => {
    const userRepository = await loadModule('repositories/userRepository.js');
    h.db([/FROM users ORDER BY id ASC/, [{ id: '1' }, { id: '2' }]]);
    assert.deepEqual(await userRepository.getAllUsers(), [{ id: '1' }, { id: '2' }]);
    assert.deepEqual(h.statements, [stmt('pool', SQL.getAllUsers)]);
  });

  it('slipRepository.findById delegates to the id/slip_number lookup', async () => {
    const slipRepository = await loadModule('repositories/slipRepository.js');
    h.db([/FROM e_slips WHERE id = \$1/, [{ id: '9', store_code: 'S' }]]);
    assert.deepEqual(await slipRepository.findById('9'), { id: '9', store_code: 'S', items: [], status_logs: [] });
    assert.deepEqual(h.statements, [
      stmt('pool', SQL.expireSlips),
      stmt('pool', SQL.slipById, ['9']),
      stmt('pool', SQL.slipItems, ['9']),
      stmt('pool', SQL.slipLogs, ['9']),
    ]);
  });
});
