const test = require('node:test');
const assert = require('node:assert/strict');
const StudySpot = require('../models/studyspot-model');
const controller = require('../controllers/studyspot-controller');
const auth = require('../middleware/auth-middleware');

function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('runtime selection helpers cap, remove, clear, and restore', async () => {
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

test('runtime selection explains the cap and clears session-local state', async () => {
  const { comparison } = await import('../client/src/stores/compare.js');
  comparison.clear();
  assert.equal(comparison.toggle('one'), true);
  assert.equal(comparison.toggle('two'), true);
  assert.equal(comparison.toggle('three'), true);
  assert.equal(comparison.toggle('four'), false);
  assert.deepEqual(comparison.selectedIds.value, ['one', 'two', 'three']);
  assert.match(comparison.notice.value, /up to three spots/);
  comparison.clear();
  assert.deepEqual(comparison.selectedIds.value, []);
  assert.equal(comparison.notice.value, '');
});

test('runtime removal navigation updates valid queries and exits an incomplete comparison', async () => {
  const nav = await import('../client/src/views/compare-navigation.js');
  const ids = nav.idsAfterRemoval(['one', 'two', 'three'], 'two');
  assert.deepEqual(ids, ['one', 'three']);
  assert.deepEqual(nav.comparisonLocation(ids), { path: '/compare', query: { ids: 'one,three' } });
  assert.deepEqual(nav.comparisonLocation(['one']), { path: '/' });
});

test('authenticated comparison handler returns ordered and missing records', async () => {
  const original = StudySpot.findByIds;
  const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
  StudySpot.findByIds = async () => [{ _id: ids[1], name: 'B' }, { _id: ids[0], name: 'A' }];
  try {
    const req = { query: { ids: `${ids[0]},${ids[1]},${ids[2]}` }, session: { user: { username: 'fixture' } } };
    const res = response();
    auth.apiLoggedIn(req, res, () => controller.compareSpots(req, res));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.spots.map(spot => spot._id), [ids[0], ids[1]]);
    assert.deepEqual(res.body.missingIds, ['507f1f77bcf86cd799439013']);
  } finally { StudySpot.findByIds = original; }
});

test('comparison handler enforces auth and reports database errors', async () => {
  const unauthenticated = response();
  auth.apiLoggedIn({ session: {}, query: {} }, unauthenticated, () => assert.fail('must not call handler'));
  assert.equal(unauthenticated.statusCode, 401);
  const original = StudySpot.findByIds;
  const originalError = console.error;
  StudySpot.findByIds = async () => { throw new Error('fixture database failure'); };
  console.error = () => {};
  try {
    const req = { query: { ids: '507f1f77bcf86cd799439011,507f1f77bcf86cd799439012' }, session: { user: { username: 'fixture' } } };
    const res = response();
    controller.compareSpots(req, res);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Error reading comparison data');
  } finally {
    StudySpot.findByIds = original;
    console.error = originalError;
  }
});
