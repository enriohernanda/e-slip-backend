import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertJson, useHarness } from './helpers/harness.js';

const h = useHarness();

describe('app shell', () => {
  it('GET / returns the healthcheck without code/data keys', async () => {
    const res = await h.request('GET', '/');
    assertJson(res, 200, { success: true, message: 'Backend E-Slip API is running' });
    assert.deepEqual(h.statements, []);
  });

  it('sends a wildcard CORS header', async () => {
    const res = await h.request('GET', '/');
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });

  it('answers CORS preflight requests with 204', async () => {
    const res = await h.request('OPTIONS', '/api/eslip/v1/slips', {
      headers: { origin: 'http://example.test', 'access-control-request-method': 'POST' },
    });
    assert.equal(res.status, 204);
    assert.equal(res.text, '');
    assert.deepEqual(h.statements, []);
  });

  it('unknown route returns 404 with method and original URL (including query)', async () => {
    const res = await h.request('GET', '/nope?x=1');
    assertJson(res, 404, {
      success: false,
      code: 'NOT_FOUND',
      message: 'Endpoint GET /nope?x=1 tidak ditemukan',
      data: null,
    });
  });

  it('GET on the login path is a 404', async () => {
    const res = await h.request('GET', '/api/eslip/v1/auth/login');
    assertJson(res, 404, {
      success: false,
      code: 'NOT_FOUND',
      message: 'Endpoint GET /api/eslip/v1/auth/login tidak ditemukan',
      data: null,
    });
  });

  for (const method of ['PUT', 'PATCH', 'DELETE']) {
    it(`${method} on a slip is a 404 and never runs authentication`, async () => {
      const res = await h.request(method, '/api/eslip/v1/slips/1');
      assertJson(res, 404, {
        success: false,
        code: 'NOT_FOUND',
        message: `Endpoint ${method} /api/eslip/v1/slips/1 tidak ditemukan`,
        data: null,
      });
      assert.deepEqual(h.statements, []);
    });
  }

  it('malformed JSON returns 400 BAD_REQUEST without the parser message and is not logged', async () => {
    const res = await h.request('POST', '/api/eslip/v1/auth/login', { raw: '{bad' });
    assertJson(res, 400, { success: false, code: 'BAD_REQUEST', message: 'Request body bukan JSON yang valid', data: null });
    assert.deepEqual(h.logs, []);
  });

  it('body over the 100kb JSON limit returns 413 PAYLOAD_TOO_LARGE', async () => {
    const res = await h.request('POST', '/api/eslip/v1/auth/login', { raw: `"${'x'.repeat(110 * 1024)}"` });
    assertJson(res, 413, { success: false, code: 'PAYLOAD_TOO_LARGE', message: 'Ukuran request body melebihi batas', data: null });
    assert.deepEqual(h.logs, []);
  });

  it('login route tolerates a trailing slash', async () => {
    const res = await h.request('POST', '/api/eslip/v1/auth/login/');
    assert.equal(res.status, 422);
  });

  it('login route matching is case-insensitive', async () => {
    const res = await h.request('POST', '/API/ESLIP/V1/AUTH/LOGIN');
    assert.equal(res.status, 422);
  });

  it('slip list route tolerates a trailing slash', async () => {
    const res = await h.request('GET', '/api/eslip/v1/slips/');
    assert.equal(res.status, 401);
  });

  it('HEAD on the slip list runs authentication (GET route) with no body', async () => {
    const res = await h.request('HEAD', '/api/eslip/v1/slips');
    assert.equal(res.status, 401);
    assert.equal(res.text, '');
  });
});
