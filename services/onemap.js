// Server-side OneMap client. The token stays here so it never reaches the browser.
// Needs ONEMAP_EMAIL and ONEMAP_PASSWORD in config.env (register at https://www.onemap.gov.sg/apidocs/register).

let token = null;
let expiresAt = 0; // ms timestamp

// OneMap tokens last ~3 days; fetch a new one when the cached one is about to expire
async function getToken() {
  if (token && Date.now() < expiresAt - 60_000) return token;

  if (!process.env.ONEMAP_EMAIL || !process.env.ONEMAP_PASSWORD) {
    throw new Error('ONEMAP_EMAIL and ONEMAP_PASSWORD must be set in config.env');
  }

  const res = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.ONEMAP_EMAIL, password: process.env.ONEMAP_PASSWORD }),
  });
  if (!res.ok) throw new Error(`OneMap login failed (${res.status})`);

  const data = await res.json();
  token = data.access_token;
  expiresAt = Number(data.expiry_timestamp) * 1000;
  return token;
}

// Search OneMap for a place name, address or postal code.
// Returns [{ name, address, postal, lat, lng }] (empty if nothing matched).
exports.search = async function (searchVal, pageNum = 1) {
  const url =
    'https://www.onemap.gov.sg/api/common/elastic/search' +
    `?searchVal=${encodeURIComponent(searchVal)}` +
    `&returnGeom=Y&getAddrDetails=Y&pageNum=${pageNum}`;

  const res = await fetch(url, { headers: { Authorization: await getToken() } });
  if (!res.ok) throw new Error(`OneMap search failed (${res.status})`);

  const data = await res.json();
  return data.results.map(place => ({
    name: place.BUILDING !== 'NIL' ? place.BUILDING : place.ADDRESS,
    address: place.ADDRESS,
    postal: place.POSTAL,
    lat: parseFloat(place.LATITUDE),
    lng: parseFloat(place.LONGITUDE),
  }));
};

// Look up the coordinates of a 6-digit postal code. Returns { lat, lng } or null if not found.
exports.geocodePostal = async function (postal) {
  const code = String(postal).padStart(6, '0');
  const results = await exports.search(code);
  const match = results.find(r => r.postal === code) || results[0];
  return match ? { lat: match.lat, lng: match.lng } : null;
};
