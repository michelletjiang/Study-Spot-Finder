// ACTIVE: gets and caches the OneMap login token. services/onemap.js uses it. In the demo no real OneMap call is made.
// The dependencies are passed in as options so tests/onemap-auth.test.js can use fake ones instead of the network.
// Small injectable OneMap token manager. Production uses global fetch and Date.now;
// tests can provide deterministic clock/fetch fixtures without contacting OneMap.
// Returns a function that gives back a valid token. fetchImpl, now and env default to the real fetch, the real clock and process.env.
function createTokenManager({ fetchImpl = fetch, now = () => Date.now(), env = process.env } = {}) {
  // The cached token, empty until the first request.
  let token = null;
  // When the cached token expires, in milliseconds since 1970.
  let expiresAt = 0;

  // This inner function is what other files call.
  return async function getToken() {
    // Reuse the cached token while it is valid, with a 60 second safety margin before it expires.
    if (token && now() < expiresAt - 60_000) return token;
    // Without OneMap credentials in the environment we cannot log in, so fail with a clear message (the message names the settings, not their values).
    if (!env.ONEMAP_EMAIL || !env.ONEMAP_PASSWORD) {
      throw new Error('ONEMAP_EMAIL and ONEMAP_PASSWORD must be set in config.env');
    }
    // Ask OneMap for a new token. Only reached when the cache is empty or about to expire.
    const res = await fetchImpl('https://www.onemap.gov.sg/api/auth/post/getToken', {
      // Send the account details as JSON in a POST request.
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      // The credentials come from the environment passed in above.
      body: JSON.stringify({ email: env.ONEMAP_EMAIL, password: env.ONEMAP_PASSWORD }),
    });
    // A non-2xx answer becomes an error that does not include the response body.
    if (!res.ok) throw new Error(`OneMap login failed (${res.status})`);
    // Parse the JSON reply.
    const data = await res.json();
    // Remember the token.
    token = data.access_token;
    // OneMap reports expiry in seconds, so multiply by 1000 to compare with Date.now.
    expiresAt = Number(data.expiry_timestamp) * 1000;
    // Hand the token back to the caller.
    return token;
  };
}

// Export the factory so onemap.js and the test can use it.
module.exports = { createTokenManager };
