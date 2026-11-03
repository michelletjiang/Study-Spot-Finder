// TEST: checks the study-preference rules used by PUT /api/profile/preferences (lib/preferences.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePreferences, withDefaults, DEFAULT_PREFERENCES } = require('../lib/preferences');

test('valid preferences are kept and missing ones default to "don\'t mind"', () => {
  const { preferences, errors } = parsePreferences({ needs: { quiet: 'must', power: 'nice' }, distance: 'high', seats: 4 });
  assert.equal(errors, undefined);
  assert.deepEqual(preferences, { needs: { quiet: 'must', power: 'nice', rated: 'off', seatsFree: 'off' }, distance: 'high', seats: 4 });
});

test('unknown levels, distances and seat counts are refused', () => {
  assert.ok(parsePreferences({ needs: { quiet: 'always' } }).errors);
  assert.ok(parsePreferences({ distance: 'far' }).errors);
  assert.ok(parsePreferences({ seats: 3 }).errors);
  assert.ok(parsePreferences({ seats: '4' }).errors);
});

test('accounts without saved preferences get the defaults', () => {
  assert.deepEqual(withDefaults(undefined), DEFAULT_PREFERENCES);
  assert.deepEqual(withDefaults({ needs: { quiet: 'nice' } }).needs.quiet, 'nice');
});
