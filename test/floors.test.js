// TEST: the floor rules for buildings and study spots (lib/floors.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkLevels, isFloorOf, floorRange } = require('../lib/floors');

test('a building needs 1-10 floors and 0-2 basement levels', () => {
  assert.equal(checkLevels({ floors: 5 }), null);
  assert.equal(checkLevels({ floors: '3', basements: '2' }), null);
  assert.ok(checkLevels({ floors: 0 }));
  assert.ok(checkLevels({ floors: 11 }));
  assert.ok(checkLevels({ floors: 2.5 }));
  assert.ok(checkLevels({ floors: 3, basements: 3 }));
  assert.ok(checkLevels({ floors: 3, basements: -1 }));
});

test('a spot can only be on one of its building\'s floors', () => {
  const law = { floors: 3, basements: 2 };
  assert.equal(isFloorOf('B2', law), true);
  assert.equal(isFloorOf('b1', law), true);
  assert.equal(isFloorOf('3', law), true);
  assert.equal(isFloorOf('B3', law), false);
  assert.equal(isFloorOf('4', law), false);
  assert.equal(isFloorOf('B1', { floors: 3, basements: 0 }), false);
  assert.equal(isFloorOf('B1', { floors: 3 }), false); // no basements saved
});

test('the allowed floors read naturally in error messages', () => {
  assert.equal(floorRange({ floors: 5 }), '1-5');
  assert.equal(floorRange({ floors: 5, basements: 1 }), 'B1 or 1-5');
  assert.equal(floorRange({ floors: 3, basements: 2 }), 'B1, B2 or 1-3');
});
