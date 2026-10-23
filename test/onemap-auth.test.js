const test = require('node:test');
const assert = require('node:assert/strict');
const { createTokenManager } = require('../services/onemap-auth');

test('OneMap token manager reuses a valid token and refreshes near expiry', async () => {
  let now = 0;
  let calls = 0;
  const tokens = ['fixture-token-1', 'fixture-token-2'];
  const getToken = createTokenManager({
    now: () => now,
    env: { ONEMAP_EMAIL: 'fixture@example.test', ONEMAP_PASSWORD: 'fixture-password' },
    fetchImpl: async () => {
      const token = tokens[calls++];
      return { ok: true, json: async () => ({ access_token: token, expiry_timestamp: String((now + 120000) / 1000) }) };
    },
  });
  assert.equal(await getToken(), 'fixture-token-1');
  assert.equal(await getToken(), 'fixture-token-1');
  assert.equal(calls, 1);
  now = 70000; // within the one-minute refresh safety window
  assert.equal(await getToken(), 'fixture-token-2');
  assert.equal(calls, 2);
});
