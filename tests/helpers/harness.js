import { after, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, loadModule } from './loader.js';

export function normalizeSql(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

export function stmt(via, sql, params = null) {
  return { via, sql: normalizeSql(sql), params };
}

/**
 * Runs the real Express app on an ephemeral port with the pg Pool stubbed at its boundary
 * (pool.query and pool.connect). Every statement is recorded in order, so tests can assert
 * the exact SQL, parameters and transaction boundaries without a real database.
 *
 * Queries are answered by routes registered with `h.db(...)`: [pattern, result] pairs where
 * pattern is a RegExp tested against the normalized SQL, and result is an array of rows or a
 * function (params, sql) returning rows (or throwing to simulate a database error).
 */
export function useHarness() {
  const h = {
    statements: [],
    logs: [],
    routes: [],
    pool: null,
    baseUrl: null,

    db(...routes) {
      h.routes.push(...routes);
    },

    async request(method, path, { body, raw, headers = {}, token } = {}) {
      const init = { method, headers: { ...headers } };
      if (token !== undefined) init.headers.authorization = `Bearer ${token}`;
      if (raw !== undefined) {
        init.body = raw;
        init.headers['content-type'] = 'application/json';
      } else if (body !== undefined) {
        init.body = JSON.stringify(body);
        init.headers['content-type'] = 'application/json';
      }
      const res = await fetch(`${h.baseUrl}${path}`, init);
      return { status: res.status, headers: res.headers, text: await res.text() };
    },
  };

  async function answer(via, text, params) {
    const sql = normalizeSql(text);
    h.statements.push({ via, sql, params: params ?? null });
    const route = h.routes.find(([pattern]) => pattern.test(sql));
    if (!route) return { rows: [] };
    const result = typeof route[1] === 'function' ? await route[1](params, sql) : route[1];
    return { rows: result };
  }

  let server;

  before(async () => {
    const app = await loadApp();
    const { pool } = await loadModule('config/db.js');
    h.pool = pool;
    mock.method(pool, 'query', (text, params) => answer('pool', text, params));
    mock.method(pool, 'connect', async () => ({
      query: (text, params) => answer('client', text, params),
      release: () => h.statements.push({ via: 'client', sql: 'RELEASE', params: null }),
    }));
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    h.baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach((t) => {
    h.statements.length = 0;
    h.logs.length = 0;
    h.routes.length = 0;
    // Captured (and silenced) so log side effects can be asserted; restored after each test.
    t.mock.method(console, 'warn', (...args) => h.logs.push(['warn', ...args]));
    t.mock.method(console, 'error', (...args) => h.logs.push(['error', ...args]));
  });

  after(async () => {
    mock.restoreAll();
    await new Promise((resolve) => server.close(resolve));
  });

  return h;
}

// Compares the raw body text, so key order and absent keys are part of the assertion.
export function assertJson(res, status, expected) {
  assert.equal(res.status, status);
  assert.equal(res.text, JSON.stringify(expected));
}

// Asserts that errorHandler logged exactly one error with the given message.
export function assertErrorLogged(h, message) {
  assert.equal(h.logs.length, 1);
  const [level, label, error] = h.logs[0];
  assert.equal(level, 'error');
  assert.equal(label, '[Error Logger]:');
  assert.equal(error.message, message);
}
