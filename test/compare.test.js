// TEST: checks the id parser used by GET /api/spots/compare.
// node:test is Node's built-in test runner.
const test = require('node:test');
// assert/strict compares values exactly.
const assert = require('node:assert/strict');
// The function under test, from lib/compare.js.
const { parseComparisonIds } = require('../lib/compare');

// Two valid ids are accepted. One id, a repeated id and a malformed id are not.
test('comparison accepts exactly two or three unique object ids', () => {
  const two = parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439012');
  assert.equal(two.valid, true);
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011').valid, false);
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439011').valid, false);
  assert.equal(parseComparisonIds('bad,507f1f77bcf86cd799439012').valid, false);
});

// Three ids are accepted and four are not, which matches the three-spot cap in the Vue shortlist.
test('comparison caps selections at three', () => {
  assert.equal(parseComparisonIds([
    '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'
  ].join(',')).valid, true);
  assert.equal(parseComparisonIds([
    '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'
  ].join(',')).valid, false);
});
