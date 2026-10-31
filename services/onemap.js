// ACTIVE: server-side OneMap client used by controllers/directions-controller.js (and by scripts/geocode-buildings.js, which the demo never runs). The demo blocks outgoing provider calls.
// Server-side OneMap client. The token stays here so it never reaches the browser.
// Needs ONEMAP_EMAIL and ONEMAP_PASSWORD in config.env (register at https://www.onemap.gov.sg/apidocs/register).

// The token manager from onemap-auth.js.
const { createTokenManager } = require('./onemap-auth');

// OneMap tokens last ~3 days; fetch a new one when the cached one is about to expire.
// One shared token getter, so every request here reuses the same cached token.
const getToken = createTokenManager();

// Helper that sends a GET to OneMap with the token in the Authorization header.
// GET a OneMap API URL with the token attached and return the parsed JSON
async function get(url, what) {
  // The token is awaited first, then attached to the request.
  const res = await fetch(url, { headers: { Authorization: await getToken() } });
  // A failed HTTP status becomes an error that names which request failed.
  if (!res.ok) throw new Error(`OneMap ${what} failed (${res.status})`);
  // Success: return the parsed JSON.
  return res.json();
}

// Search OneMap for a place. Not called by the Vue app in the demo.
// Search OneMap for a place name, address or postal code.
// Returns [{ name, address, postal, lat, lng }] (empty if nothing matched).
// search is exported so geocodePostal and the geocode script can use it.
exports.search = async function (searchVal, pageNum = 1) {
  // Build the search URL.
  const url =
    'https://www.onemap.gov.sg/api/common/elastic/search' +
    // encodeURIComponent keeps special characters from breaking the URL.
    `?searchVal=${encodeURIComponent(searchVal)}` +
    `&returnGeom=Y&getAddrDetails=Y&pageNum=${pageNum}`;

  // Call the helper and read the list of results.
  const data = await get(url, 'search');
  // Reshape each OneMap result into the simple object the rest of the app expects.
  return data.results.map(place => ({
    // Use the building name when there is one, otherwise the address ("NIL" means none).
    name: place.BUILDING !== 'NIL' ? place.BUILDING : place.ADDRESS,
    address: place.ADDRESS,
    postal: place.POSTAL,
    // OneMap sends coordinates as text, so convert them to numbers.
    lat: parseFloat(place.LATITUDE),
    lng: parseFloat(place.LONGITUDE),
  }));
};

// Turn a postal code into coordinates. Used by the geocode script.
// Look up the coordinates of a 6-digit postal code. Returns { lat, lng } or null if not found.
exports.geocodePostal = async function (postal) {
  // Pad to 6 digits, because some postal codes lose their leading zero when stored as numbers.
  const code = String(postal).padStart(6, '0');
  // Reuse search() with the padded code.
  const results = await exports.search(code);
  // Prefer the result whose postal code matches exactly; otherwise take the first.
  const match = results.find(r => r.postal === code) || results[0];
  // Return null when nothing was found.
  return match ? { lat: match.lat, lng: match.lng } : null;
};

// Routing: the code below fetches walking and public transport routes for MiniMap.vue.
// ---------- Routing ----------
// Both route types are turned into the same shape so the client can draw either one:
// { mode: 'walk' | 'pt', duration (s), distance (m),
//   legs: [{ mode: 'WALK' | 'BUS' | 'SUBWAY' | ..., route, from, to, duration, distance, points: [[lat, lng], ...] }] }

// Decode OneMap's compressed route geometry (a Google polyline string) into a list of [lat, lng] points the map can draw.
// Decode a Google encoded polyline (what OneMap returns for route geometry) into [[lat, lng], ...]
function decodePolyline(str) {
  // The decoded points and the running lat/lng totals.
  const points = [];
  let index = 0, lat = 0, lng = 0;
  // Walk through the string; each pair of numbers is one point.
  while (index < str.length) {
    // Each point holds a latitude change, then a longitude change.
    for (const axis of ['lat', 'lng']) {
      let result = 0, shift = 0, byte;
      do {
        // Each character carries 5 bits of the number; subtract 63 to get them.
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      // A set bit 0x20 means more characters follow for this number.
      } while (byte >= 0x20);
      // The lowest bit is the sign, the rest is the size of the change.
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      // Changes are added to the previous value (the polyline stores differences).
      if (axis === 'lat') lat += delta; else lng += delta;
    }
    // Divide by 1e5 to get real degrees.
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// Base address of the OneMap routing service.
const ROUTE_URL = 'https://www.onemap.gov.sg/api/public/routingsvc/route';

// Fetch the walking route between two "lat,lng" strings.
async function walkRoute(from, to) {
  const data = await get(`${ROUTE_URL}?start=${from}&end=${to}&routeType=walk`, 'walk route');
  // No geometry means OneMap found no walking route.
  if (!data.route_geometry) return null;
  // Pull the total time and distance out of the summary.
  const { total_time, total_distance } = data.route_summary;
  // Return it in the shared route shape so the client can draw it.
  return {
    mode: 'walk',
    duration: total_time,
    distance: total_distance,
    legs: [{ mode: 'WALK', route: '', from: 'Your location', to: '', duration: total_time, distance: total_distance,
             points: decodePolyline(data.route_geometry) }],
  };
}

// The public transport planner wants the Singapore date and time in a fixed text format.
// The public transport planner needs the current date and time in Singapore (MM-DD-YYYY, HH:MM:SS)
function singaporeNow() {
  // Intl.DateTimeFormat reads the current moment in the Asia/Singapore time zone and splits it into named parts.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map(p => [p.type, p.value])
  );
  // Assemble the date as MM-DD-YYYY and the time as HH:MM:SS.
  return { date: `${parts.month}-${parts.day}-${parts.year}`, time: `${parts.hour}:${parts.minute}:${parts.second}` };
}

// Fetch a public transport route (bus and train).
async function transitRoute(from, to) {
  // Get the Singapore date and time.
  const { date, time } = singaporeNow();
  // Build the URL: from, to, route type, date and time, at most 1000 m of walking, up to 3 itineraries.
  const url = `${ROUTE_URL}?start=${from}&end=${to}&routeType=pt` +
    `&date=${date}&time=${encodeURIComponent(time)}&mode=TRANSIT&maxWalkDistance=1000&numItineraries=3`;
  // Call the helper.
  const data = await get(url, 'transit route');

  // The plans are optional, so fall back to an empty list.
  const itineraries = data.plan?.itineraries || [];
  // No itineraries means no route.
  if (itineraries.length === 0) return null;
  // Choose the fastest itinerary.
  const best = itineraries.reduce((a, b) => (b.duration < a.duration ? b : a));
  // Return it in the same shape as the walking route.
  return {
    mode: 'pt',
    duration: best.duration,
    // Add up the legs' distances and round.
    distance: Math.round(best.legs.reduce((sum, leg) => sum + leg.distance, 0)),
    // Reshape each leg of the trip.
    legs: best.legs.map(leg => ({
      mode: leg.mode,
      route: leg.route || '',
      // Replace OneMap's placeholder names "Origin" and "Destination" with friendlier text.
      from: leg.from.name === 'Origin' ? 'Your location' : leg.from.name,
      to: leg.to.name === 'Destination' ? '' : leg.to.name,
      duration: leg.duration,
      distance: Math.round(leg.distance),
      // Decode this leg's geometry into points for the map.
      points: decodePolyline(leg.legGeometry.points),
    })),
  };
}

// Ask for both route types and combine the results.
// Get walking and public transport routes between two "lat,lng" strings.
// Returns { routes: [...], fastest: 'walk' | 'pt' }; a mode that fails or finds nothing is left out.
exports.routes = async function (from, to) {
  // allSettled waits for both calls and does not stop if one fails.
  const results = await Promise.allSettled([walkRoute(from, to), transitRoute(from, to)]);
  // Log the reason for any failed call.
  results.filter(r => r.status === 'rejected').forEach(r => console.error(r.reason.message));

  // Keep only the successful, non-empty routes.
  const routes = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  // Neither worked: throw, and the directions controller turns it into an error response.
  if (routes.length === 0) throw new Error('No route found');
  // Pick the mode with the shortest duration.
  const fastest = routes.reduce((a, b) => (b.duration < a.duration ? b : a)).mode;
  // The client receives all routes and which one is fastest.
  return { routes, fastest };
};
