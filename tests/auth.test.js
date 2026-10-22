import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { assertErrorLogged, assertJson, stmt, useHarness } from './helpers/harness.js';
import { ACTIVE_USER, FIXED_NOW, Q, SERVER_ERROR, SQL, TOKEN, dbError } from './helpers/fixtures.js';

const h = useHarness();

const LOGIN = '/api/eslip/v1/auth/login';
const PASSWORD = 'admin123';
const HASH = bcrypt.hashSync(PASSWORD, 4);

const loginRow = {
  id: '1',
  nik: 'SALES-10011-001',
  name: 'Ahmad Fauzi',
  username: 'sales01',
  password: HASH,
  store_code: 'STORE-10011',
  is_active: true,
  last_synced_at: '2026-10-21T03:00:00.000Z',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_date: '2026-10-21T03:00:00.000Z',
};

// Deliberately differs from the SELECT row: the response must be built from the UPDATE row.
const updatedRow = {
  id: '1',
  nik: 'SALES-10011-001',
  name: 'Ahmad Fauzi (returned)',
  username: 'sales01',
  store_code: 'STORE-10011',
  is_active: true,
  last_synced_at: '2026-10-22T03:00:00.000Z',
};

const validationError = {
  success: false,
  code: 'VALIDATION_ERROR',
  message: 'Username dan password wajib diisi!',
  data: null,
};

const invalidCredentials = {
  success: false,
  code: 'UNAUTHORIZED',
  message: 'Kredensial tidak valid (Username atau password salah)',
  data: null,
};

describe('POST /api/eslip/v1/auth/login — input', () => {
  const cases = [
    ['no body', undefined],
    ['empty object', {}],
    ['missing password', { username: 'sales01' }],
    ['missing username', { password: PASSWORD }],
    ['empty password', { username: 'sales01', password: '' }],
  ];
  for (const [name, body] of cases) {
    it(`${name} → 422 without touching the database`, async () => {
      const res = await h.request('POST', LOGIN, { body });
      assertJson(res, 422, validationError);
      assert.deepEqual(h.statements, []);
      assert.deepEqual(h.logs, []);
    });
  }
});

describe('POST /api/eslip/v1/auth/login — outcomes', () => {
  it('unknown user → 401 and a warning', async () => {
    const res = await h.request('POST', LOGIN, { body: { username: 'ghost', password: 'x' } });
    assertJson(res, 401, invalidCredentials);
    assert.deepEqual(h.statements, [stmt('pool', SQL.findUserForLogin, ['ghost'])]);
    assert.deepEqual(h.logs, [['warn', '[AUTH] Login gagal: User "ghost" tidak ditemukan di tabel users.']]);
  });

  it('inactive user → 403 before the password is checked', async () => {
    h.db([Q.findUserForLogin, [{ ...loginRow, is_active: false }]]);
    const res = await h.request('POST', LOGIN, { body: { username: 'sales01', password: 'wrong' } });
    assertJson(res, 403, {
      success: false,
      code: 'FORBIDDEN',
      message: 'Akun karyawan tidak aktif di sistem. Hubungi Administrator / HR.',
      data: null,
    });
    assert.deepEqual(h.statements, [stmt('pool', SQL.findUserForLogin, ['sales01'])]);
    assert.deepEqual(h.logs, [['warn', '[AUTH] Login gagal: Akun "sales01" berstatus non-aktif (is_active = false).']]);
  });

  it('wrong password → 401 and a warning, no update', async () => {
    h.db([Q.findUserForLogin, [loginRow]]);
    const res = await h.request('POST', LOGIN, { body: { username: 'sales01', password: 'wrong' } });
    assertJson(res, 401, invalidCredentials);
    assert.deepEqual(h.statements, [stmt('pool', SQL.findUserForLogin, ['sales01'])]);
    assert.deepEqual(h.logs, [['warn', '[AUTH] Login gagal: Password untuk user "sales01" tidak cocok.']]);
  });

  it('bcrypt match → 200 with user from the UPDATE row and an eslip token', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
    h.db([Q.findUserForLogin, [loginRow]], [Q.updateLastLogin, [updatedRow]]);
    const res = await h.request('POST', LOGIN, { body: { username: 'sales01', password: PASSWORD } });
    assertJson(res, 200, {
      success: true,
      code: 'OK',
      message: 'Login berhasil',
      data: {
        user: {
          id: '1',
          nik: 'SALES-10011-001',
          name: 'Ahmad Fauzi (returned)',
          username: 'sales01',
          store_code: 'STORE-10011',
          role: 'sales',
          is_active: true,
          last_synced_at: '2026-10-22T10:00:00+07:00',
        },
        token: `eslip-token-SALES-10011-001-${FIXED_NOW}`,
      },
    });
    assert.deepEqual(h.statements, [
      stmt('pool', SQL.findUserForLogin, ['sales01']),
      stmt('pool', SQL.updateLastLogin, ['1']),
    ]);
    assert.deepEqual(h.logs, []);
  });

  it('plaintext password equality is also accepted', async () => {
    h.db([Q.findUserForLogin, [{ ...loginRow, password: 'plain-secret' }]], [Q.updateLastLogin, [updatedRow]]);
    const res = await h.request('POST', LOGIN, { body: { username: 'sales01', password: 'plain-secret' } });
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(res.text).data.user.name, 'Ahmad Fauzi (returned)');
  });

  it('a NIK is not accepted as the username (lookup is by username only)', async () => {
    h.db([Q.findUserForLogin, (params) => (params[0] === loginRow.username ? [loginRow] : [])]);
    const res = await h.request('POST', LOGIN, { body: { username: loginRow.nik, password: PASSWORD } });
    assertJson(res, 401, invalidCredentials);
    assert.deepEqual(h.statements, [stmt('pool', SQL.findUserForLogin, [loginRow.nik])]);
    assert.deepEqual(h.logs, [['warn', `[AUTH] Login gagal: User "${loginRow.nik}" tidak ditemukan di tabel users.`]]);
  });

  it('database error with a driver code on lookup → generic 500, driver details only in the log', async () => {
    h.db([Q.findUserForLogin, () => { throw dbError('connect ECONNREFUSED 127.0.0.1:5432', 'ECONNREFUSED'); }]);
    const res = await h.request('POST', LOGIN, { body: { username: 'sales01', password: PASSWORD } });
    assertJson(res, 500, SERVER_ERROR);
    assertErrorLogged(h, 'connect ECONNREFUSED 127.0.0.1:5432');
  });

  it('database error without a code on update → generic 500', async () => {
    h.db([Q.findUserForLogin, [loginRow]], [Q.updateLastLogin, () => { throw dbError('update failed'); }]);
    const res = await h.request('POST', LOGIN, { body: { username: 'sales01', password: PASSWORD } });
    assertJson(res, 500, SERVER_ERROR);
    assertErrorLogged(h, 'update failed');
  });

  it('non-string password reaches bcrypt and fails with a generic 500', async () => {
    h.db([Q.findUserForLogin, [loginRow]]);
    const res = await h.request('POST', LOGIN, { body: { username: 'sales01', password: 12345 } });
    assertJson(res, 500, SERVER_ERROR);
    assertErrorLogged(h, 'Illegal arguments: number, string');
  });
});

describe('GET /api/eslip/v1/auth/me', () => {
  it('returns the profile with last_synced_at in WIB', async () => {
    h.db([Q.findUserByNik, [ACTIVE_USER]]);
    const res = await h.request('GET', '/api/eslip/v1/auth/me', { token: TOKEN });
    assertJson(res, 200, {
      success: true,
      code: 'OK',
      message: 'Profil pengguna berhasil diambil',
      data: {
        user: {
          id: '1',
          nik: 'SALES-10011-001',
          name: 'Ahmad Fauzi',
          username: 'sales01',
          store_code: 'STORE-10011',
          role: 'sales',
          is_active: true,
          last_synced_at: '2026-10-21T10:00:00+07:00',
        },
      },
    });
  });

  it('user removed between authentication and lookup → 404 NOT_FOUND', async () => {
    let lookups = 0;
    h.db([Q.findUserByNik, () => (++lookups === 1 ? [ACTIVE_USER] : [])]);
    const res = await h.request('GET', '/api/eslip/v1/auth/me', { token: TOKEN });
    assertJson(res, 404, { success: false, code: 'NOT_FOUND', message: 'Pengguna tidak ditemukan', data: null });
  });
});

describe('authMiddleware (via GET /api/eslip/v1/slips)', () => {
  const LIST = '/api/eslip/v1/slips';
  const missingToken = {
    success: false,
    code: 'UNAUTHORIZED',
    message: 'Akses ditolak: Token autentikasi tidak ditemukan',
    data: null,
  };
  const unrecognizedToken = {
    success: false,
    code: 'INVALID_TOKEN',
    message: 'Token tidak valid atau format tidak dikenali',
    data: null,
  };

  const missingCases = [
    ['no Authorization header', {}],
    ['non-Bearer scheme', { authorization: 'Basic abc' }],
    ['lowercase bearer', { authorization: 'bearer eslip-token-SALES-10011-001-1' }],
    ['Bearer with empty token', { authorization: 'Bearer ' }],
  ];
  for (const [name, headers] of missingCases) {
    it(`${name} → 401 UNAUTHORIZED`, async () => {
      const res = await h.request('GET', LIST, { headers });
      assertJson(res, 401, missingToken);
      assert.deepEqual(h.statements, []);
    });
  }

  it('unknown token prefix → 401 INVALID_TOKEN without a lookup', async () => {
    const res = await h.request('GET', LIST, { token: 'random-token-value' });
    assertJson(res, 401, unrecognizedToken);
    assert.deepEqual(h.statements, []);
  });

  it('prefix with nothing after it → 401 INVALID_TOKEN without a lookup', async () => {
    const res = await h.request('GET', LIST, { token: 'eslip-token-' });
    assertJson(res, 401, unrecognizedToken);
    assert.deepEqual(h.statements, []);
  });

  const nikCases = [
    ['eslip-token-SALES-10011-001-1729000000000', 'SALES-10011-001'],
    ['hcm-mock-token-1002345-1729000000000', '1002345'],
    ['dummy-token-SALES-10012-001-42', 'SALES-10012-001'],
    ['eslip-token-ABC', 'ABC'],
    ['eslip-token-SALES-10011-001', 'SALES-10011'],
  ];
  for (const [token, nik] of nikCases) {
    it(`token ${token} looks up NIK ${nik}`, async () => {
      await h.request('GET', LIST, { token });
      assert.deepEqual(h.statements, [stmt('pool', SQL.findUserByNik, [nik])]);
    });
  }

  it('user not found → 401 INVALID_TOKEN', async () => {
    const res = await h.request('GET', LIST, { token: 'eslip-token-SALES-10011-001-1' });
    assertJson(res, 401, {
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Pengguna token tidak ditemukan di sistem',
      data: null,
    });
  });

  it('inactive user → 403 FORBIDDEN', async () => {
    h.db([Q.findUserByNik, [{ id: '9', nik: 'X', store_code: 'STORE-10011', is_active: false }]]);
    const res = await h.request('GET', LIST, { token: 'eslip-token-X-1' });
    assertJson(res, 403, {
      success: false,
      code: 'FORBIDDEN',
      message: 'Akun sales tidak aktif. Hubungi administrator.',
      data: null,
    });
    assert.equal(h.statements.length, 1);
  });

  it('database error → generic 500 and logged, not treated as an invalid token', async () => {
    h.db([Q.findUserByNik, () => { throw dbError('boom db'); }]);
    const res = await h.request('GET', LIST, { token: 'eslip-token-X-1' });
    assertJson(res, 500, SERVER_ERROR);
    assertErrorLogged(h, 'boom db');
  });
});
