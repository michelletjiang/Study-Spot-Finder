const test = require('node:test');
const assert = require('node:assert/strict');
const { parseComparisonIds } = require('../lib/compare');

test('comparison accepts exactly two or three unique object ids', () => {
  const two = parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439012');
  assert.equal(two.valid, true);
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011').valid, false);
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439011').valid, false);
  assert.equal(parseComparisonIds('bad,507f1f77bcf86cd799439012').valid, false);
});

test('comparison caps selections at three', () => {
  assert.equal(parseComparisonIds([
    '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'
  ].join(',')).valid, true);
  assert.equal(parseComparisonIds([
    '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'
  ].join(',')).valid, false);
});
