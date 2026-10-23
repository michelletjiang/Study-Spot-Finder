const test = require('node:test');
const assert = require('node:assert/strict');
const onemap = require('../services/onemap');
const directions = require('../controllers/directions-controller');

function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('app-facing directions handler returns stubbed OneMap route data', async () => {
  const original = onemap.routes;
  onemap.routes = async (from, to) => ({ routes: [{ mode: 'walk', distance: 100, duration: 80, legs: [] }], fastest: 'walk', from, to });
  try {
    const res = response();
    await directions.getDirections({ query: { from: '1.2966,103.7764', to: '1.2960,103.7709' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.fastest, 'walk');
    assert.equal(res.body.routes[0].distance, 100);
  } finally { onemap.routes = original; }
});

test('app-facing directions handler rejects unsafe coordinate input', async () => {
  const res = response();
  await directions.getDirections({ query: { from: 'secret', to: '1.2960,103.7709' } }, res);
  assert.equal(res.statusCode, 400);
});
