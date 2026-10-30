// TEST: checks the directions endpoint's handler with a fake OneMap service. No real provider call is made.
const test = require('node:test');
const assert = require('node:assert/strict');
// The OneMap service, whose routes function is replaced by a fake below.
const onemap = require('../services/onemap');
// The controller that answers GET /api/directions.
const directions = require('../controllers/directions-controller');

// A tiny fake response object. It records the status code and JSON body.
function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

// Proves a valid request returns the fake route data.
test('app-facing directions handler returns stubbed OneMap route data', async () => {
  // Keep the real function.
  const original = onemap.routes;
  // Replace it with a fake, so no network call happens.
  onemap.routes = async (from, to) => ({ routes: [{ mode: 'walk', distance: 100, duration: 80, legs: [] }], fastest: 'walk', from, to });
  try {
    const res = response();
    // Call the real handler with two coordinates.
    await directions.getDirections({ query: { from: '1.2966,103.7764', to: '1.2960,103.7709' } }, res);
    // 200 means success.
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.fastest, 'walk');
    assert.equal(res.body.routes[0].distance, 100);
  // Always restore the real function.
  } finally { onemap.routes = original; }
});

// Proves text that is not a coordinate pair is rejected with 400 before the service is called.
test('app-facing directions handler rejects unsafe coordinate input', async () => {
  const res = response();
  await directions.getDirections({ query: { from: 'secret', to: '1.2960,103.7709' } }, res);
  assert.equal(res.statusCode, 400);
});
