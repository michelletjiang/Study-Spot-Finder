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

// GET a OneMap API URL with the token attached and return the parsed JSON
async function get(url, what) {
  const res = await fetch(url, { headers: { Authorization: await getToken() } });
  if (!res.ok) throw new Error(`OneMap ${what} failed (${res.status})`);
  return res.json();
}

// Search OneMap for a place name, address or postal code.
// Returns [{ name, address, postal, lat, lng }] (empty if nothing matched).
exports.search = async function (searchVal, pageNum = 1) {
  const url =
    'https://www.onemap.gov.sg/api/common/elastic/search' +
    `?searchVal=${encodeURIComponent(searchVal)}` +
    `&returnGeom=Y&getAddrDetails=Y&pageNum=${pageNum}`;

  const data = await get(url, 'search');
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

// ---------- Routing ----------
// Both route types are turned into the same shape so the client can draw either one:
// { mode: 'walk' | 'pt', duration (s), distance (m),
//   legs: [{ mode: 'WALK' | 'BUS' | 'SUBWAY' | ..., route, from, to, duration, distance, points: [[lat, lng], ...] }] }

// Decode a Google encoded polyline (what OneMap returns for route geometry) into [[lat, lng], ...]
function decodePolyline(str) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < str.length) {
    for (const axis of ['lat', 'lng']) {
      let result = 0, shift = 0, byte;
      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 'lat') lat += delta; else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

const ROUTE_URL = 'https://www.onemap.gov.sg/api/public/routingsvc/route';

async function walkRoute(from, to) {
  const data = await get(`${ROUTE_URL}?start=${from}&end=${to}&routeType=walk`, 'walk route');
  if (!data.route_geometry) return null;
  const { total_time, total_distance } = data.route_summary;
  return {
    mode: 'walk',
    duration: total_time,
    distance: total_distance,
    legs: [{ mode: 'WALK', route: '', from: 'Your location', to: '', duration: total_time, distance: total_distance,
             points: decodePolyline(data.route_geometry) }],
  };
}

// The public transport planner needs the current date and time in Singapore (MM-DD-YYYY, HH:MM:SS)
function singaporeNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map(p => [p.type, p.value])
  );
  return { date: `${parts.month}-${parts.day}-${parts.year}`, time: `${parts.hour}:${parts.minute}:${parts.second}` };
}

async function transitRoute(from, to) {
  const { date, time } = singaporeNow();
  const url = `${ROUTE_URL}?start=${from}&end=${to}&routeType=pt` +
    `&date=${date}&time=${encodeURIComponent(time)}&mode=TRANSIT&maxWalkDistance=1000&numItineraries=3`;
  const data = await get(url, 'transit route');

  const itineraries = data.plan?.itineraries || [];
  if (itineraries.length === 0) return null;
  const best = itineraries.reduce((a, b) => (b.duration < a.duration ? b : a));
  return {
    mode: 'pt',
    duration: best.duration,
    distance: Math.round(best.legs.reduce((sum, leg) => sum + leg.distance, 0)),
    legs: best.legs.map(leg => ({
      mode: leg.mode,
      route: leg.route || '',
      from: leg.from.name === 'Origin' ? 'Your location' : leg.from.name,
      to: leg.to.name === 'Destination' ? '' : leg.to.name,
      duration: leg.duration,
      distance: Math.round(leg.distance),
      points: decodePolyline(leg.legGeometry.points),
    })),
  };
}

// Get walking and public transport routes between two "lat,lng" strings.
// Returns { routes: [...], fastest: 'walk' | 'pt' }; a mode that fails or finds nothing is left out.
exports.routes = async function (from, to) {
  const results = await Promise.allSettled([walkRoute(from, to), transitRoute(from, to)]);
  results.filter(r => r.status === 'rejected').forEach(r => console.error(r.reason.message));

  const routes = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  if (routes.length === 0) throw new Error('No route found');
  const fastest = routes.reduce((a, b) => (b.duration < a.duration ? b : a)).mode;
  return { routes, fastest };
};
