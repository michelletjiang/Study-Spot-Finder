// Small injectable OneMap token manager. Production uses global fetch and Date.now;
// tests can provide deterministic clock/fetch fixtures without contacting OneMap.
function createTokenManager({ fetchImpl = fetch, now = () => Date.now(), env = process.env } = {}) {
  let token = null;
  let expiresAt = 0;

  return async function getToken() {
    if (token && now() < expiresAt - 60_000) return token;
    if (!env.ONEMAP_EMAIL || !env.ONEMAP_PASSWORD) {
      throw new Error('ONEMAP_EMAIL and ONEMAP_PASSWORD must be set in config.env');
    }
    const res = await fetchImpl('https://www.onemap.gov.sg/api/auth/post/getToken', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.ONEMAP_EMAIL, password: env.ONEMAP_PASSWORD }),
    });
    if (!res.ok) throw new Error(`OneMap login failed (${res.status})`);
    const data = await res.json();
    token = data.access_token;
    expiresAt = Number(data.expiry_timestamp) * 1000;
    return token;
  };
}

module.exports = { createTokenManager };
