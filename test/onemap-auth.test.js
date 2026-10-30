// TEST: checks the OneMap token cache with fake time and a fake network, so no provider is contacted and the credentials are made-up fixture values.
const test = require('node:test');
const assert = require('node:assert/strict');
// The token factory from services/onemap-auth.js.
const { createTokenManager } = require('../services/onemap-auth');

// Proves a valid token is reused and a new one is fetched when it is close to expiring.
test('OneMap token manager reuses a valid token and refreshes near expiry', async () => {
  // A fake clock.
  let now = 0;
  // Counts the fake token requests.
  let calls = 0;
  // The tokens the fake service hands out.
  const tokens = ['fixture-token-1', 'fixture-token-2'];
  // Build a token getter with the fake clock, fake credentials and a fake fetch.
  const getToken = createTokenManager({
    now: () => now,
    env: { ONEMAP_EMAIL: 'fixture@example.test', ONEMAP_PASSWORD: 'fixture-password' },
    fetchImpl: async () => {
      const token = tokens[calls++];
      return { ok: true, json: async () => ({ access_token: token, expiry_timestamp: String((now + 120000) / 1000) }) };
    },
  });
  // The first call fetches a token.
  assert.equal(await getToken(), 'fixture-token-1');
  // The second call reuses it without a request.
  assert.equal(await getToken(), 'fixture-token-1');
  // Only one request was made.
  assert.equal(calls, 1);
  // Move the fake clock to within one minute of expiry.
  now = 70000; // within the one-minute refresh safety window
  // Now a new token is fetched.
  assert.equal(await getToken(), 'fixture-token-2');
  // Two requests in total.
  assert.equal(calls, 2);
});
