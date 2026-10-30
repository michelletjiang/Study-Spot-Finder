// TEST: runs the real comparison code without a browser or a database. Run all tests with npm test (node --test test/*.test.js).
// node:test is Node's built-in test runner.
const test = require('node:test');
// assert/strict compares values exactly.
const assert = require('node:assert/strict');
// The spot model, whose findByIds is replaced by a fake below.
const StudySpot = require('../models/studyspot-model');
// The controller that answers GET /api/spots/compare.
const controller = require('../controllers/studyspot-controller');
// The login middleware that guards the route.
const auth = require('../middleware/auth-middleware');

// A tiny fake response object. It records the status code and JSON body, so tests can read them.
function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

// Proves the shortlist rules: restore keeps at most three unique ids, a fourth spot is refused, toggling removes, and an empty list accepts one.
test('runtime selection helpers cap, remove, clear, and restore', async () => {
  // The client file is an ES module, so it is loaded with a dynamic import.
  const selection = await import('../client/src/stores/compare-selection.js');
  let ids = selection.restoreSelection(['a', 'a', 'b', 'c', 'd']);
  assert.deepEqual(ids, ['a', 'b', 'c']);
  ids = selection.toggleSelection(ids, 'd');
  assert.deepEqual(ids, ['a', 'b', 'c']);
  ids = selection.toggleSelection(ids, 'b');
  assert.deepEqual(ids, ['a', 'c']);
  ids = selection.toggleSelection(ids, 'd');
  assert.deepEqual(ids, ['a', 'c', 'd']);
  ids = [];
  assert.deepEqual(selection.toggleSelection(ids, 'x'), ['x']);
});

// Proves the store tells the student about the three-spot limit and clears everything on clear().
test('runtime selection explains the cap and clears session-local state', async () => {
  // Load the real shortlist store.
  const { comparison } = await import('../client/src/stores/compare.js');
  comparison.clear();
  // Three spots are accepted, and the fourth returns false.
  assert.equal(comparison.toggle('one'), true);
  assert.equal(comparison.toggle('two'), true);
  assert.equal(comparison.toggle('three'), true);
  assert.equal(comparison.toggle('four'), false);
  // The shortlist stays at three.
  assert.deepEqual(comparison.selectedIds.value, ['one', 'two', 'three']);
  // The notice explains the limit.
  assert.match(comparison.notice.value, /up to three spots/);
  // Clearing empties the list and the notice (this is what logout does).
  comparison.clear();
  assert.deepEqual(comparison.selectedIds.value, []);
  assert.equal(comparison.notice.value, '');
});

// Proves the removal links: the remaining ids stay in the URL, and fewer than two sends the student home.
test('runtime removal navigation updates valid queries and exits an incomplete comparison', async () => {
  const nav = await import('../client/src/views/compare-navigation.js');
  const ids = nav.idsAfterRemoval(['one', 'two', 'three'], 'two');
  assert.deepEqual(ids, ['one', 'three']);
  assert.deepEqual(nav.comparisonLocation(ids), { path: '/compare', query: { ids: 'one,three' } });
  assert.deepEqual(nav.comparisonLocation(['one']), { path: '/' });
});

// Proves the server answer: the spots come back in the requested order and an id with no spot is listed in missingIds.
test('authenticated comparison handler returns ordered and missing records', async () => {
  // Keep the real function so it can be put back afterwards.
  const original = StudySpot.findByIds;
  const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
  // Replace the database call with fake data, so no database is needed. The fake returns the spots in a different order on purpose.
  StudySpot.findByIds = async () => [{ _id: ids[1], name: 'B' }, { _id: ids[0], name: 'A' }];
  try {
    // A fake logged-in request with three ids.
    const req = { query: { ids: `${ids[0]},${ids[1]},${ids[2]}` }, session: { user: { username: 'fixture' } } };
    const res = response();
    // Run the real login guard and then the real compare handler.
    auth.apiLoggedIn(req, res, () => controller.compareSpots(req, res));
    // Give the async handler a moment to finish.
    await new Promise(resolve => setImmediate(resolve));
    // 200 means success.
    assert.equal(res.statusCode, 200);
    // The two found spots are in the requested order, not the database order.
    assert.deepEqual(res.body.spots.map(spot => spot._id), [ids[0], ids[1]]);
    // The third id is reported as missing.
    assert.deepEqual(res.body.missingIds, ['507f1f77bcf86cd799439013']);
  // Always restore the real function.
  } finally { StudySpot.findByIds = original; }
});

// Proves a logged-out request gets 401, and a database failure gives a 500 with a clear message.
test('comparison handler enforces auth and reports database errors', async () => {
  const unauthenticated = response();
  // Without a session user the guard answers 401 and never calls the handler.
  auth.apiLoggedIn({ session: {}, query: {} }, unauthenticated, () => assert.fail('must not call handler'));
  assert.equal(unauthenticated.statusCode, 401);
  // Keep the real functions.
  const original = StudySpot.findByIds;
  const originalError = console.error;
  // Fake a database failure.
  StudySpot.findByIds = async () => { throw new Error('fixture database failure'); };
  // Silence the expected error log during the test.
  console.error = () => {};
  try {
    // A fake request with two valid ids.
    const req = { query: { ids: '507f1f77bcf86cd799439011,507f1f77bcf86cd799439012' }, session: { user: { username: 'fixture' } } };
    const res = response();
    // Call the real handler.
    controller.compareSpots(req, res);
    await new Promise(resolve => setImmediate(resolve));
    // 500 means a server error.
    assert.equal(res.statusCode, 500);
    // The message the Vue page shows.
    assert.equal(res.body.message, 'Error reading comparison data');
  } finally {
    // Put the real functions back.
    StudySpot.findByIds = original;
    console.error = originalError;
  }
});
