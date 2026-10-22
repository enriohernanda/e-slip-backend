import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/loader.js';

const { toWibDateCode, toWibIsoString } = await loadModule('utils/dateTime.js');

describe('utils/dateTime — toWibIsoString', () => {
  const cases = [
    ['a Date as returned by pg', new Date('2026-10-08T07:30:00.000Z'), '2026-10-08T14:30:00+07:00'],
    ['an ISO string', '2026-10-08T07:30:00.000Z', '2026-10-08T14:30:00+07:00'],
    ['milliseconds are dropped, not rounded', '2026-10-08T07:30:59.999Z', '2026-10-08T14:30:59+07:00'],
    ['late UTC evening is the next WIB day', '2026-10-21T18:15:00.000Z', '2026-10-22T01:15:00+07:00'],
    ['crossing the year end', '2026-12-31T17:00:00.000Z', '2027-01-01T00:00:00+07:00'],
  ];
  for (const [name, input, expected] of cases) {
    it(`formats ${name}`, () => {
      assert.equal(toWibIsoString(input), expected);
    });
  }

  it('passes null and undefined through unchanged', () => {
    assert.equal(toWibIsoString(null), null);
    assert.equal(toWibIsoString(undefined), undefined);
  });
});

describe('utils/dateTime — toWibDateCode', () => {
  const cases = [
    ['a WIB morning', '2026-10-22T03:00:00.000Z', '261022'],
    ['just before WIB midnight', '2026-10-22T16:59:59.999Z', '261022'],
    ['WIB midnight while UTC is still the previous day', '2026-10-22T17:00:00.000Z', '261023'],
  ];
  for (const [name, input, expected] of cases) {
    it(`returns YYMMDD for ${name}`, () => {
      assert.equal(toWibDateCode(new Date(input)), expected);
    });
  }
});
