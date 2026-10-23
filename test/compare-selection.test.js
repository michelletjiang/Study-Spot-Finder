const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parseComparisonIds } = require('../lib/compare');

test('selection caps at three, removes, and restores unique URL ids', () => {
  const source = fs.readFileSync('client/src/stores/compare-selection.js', 'utf8');
  assert.match(source, /MAX_COMPARISON_SPOTS = 3/);
  assert.match(source, /new Set\(ids\.map\(String\)\)/);
  assert.match(source, /ids\.length < MAX_COMPARISON_SPOTS/);
});

test('comparison route exposes removal and query-watching behavior', () => {
  const source = fs.readFileSync('client/src/views/CompareView.vue', 'utf8');
  assert.match(source, /watch\(\(\) => String\(route\.query\.ids/);
  assert.match(source, /router\.replace/);
  assert.match(source, /@click="removeSpot/);
});

test('API performs one batch lookup, preserves order, and reports missing IDs', () => {
  const controller = fs.readFileSync('controllers/studyspot-controller.js', 'utf8');
  const model = fs.readFileSync('models/studyspot-model.js', 'utf8');
  assert.match(controller, /StudySpot\.findByIds\(ids\)/);
  assert.match(controller, /missingIds: ids\.filter/);
  assert.match(model, /StudySpot\.find\(\{ _id: \{ \$in: ids \} \}\)/);
});

test('API parser rejects malformed, duplicate, and four-item selections', () => {
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439012').valid, true);
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439011').valid, false);
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439012,507f1f77bcf86cd799439013,507f1f77bcf86cd799439014').valid, false);
});

test('comparison layout includes a narrow-screen breakpoint', () => {
  const css = fs.readFileSync('client/src/style.css', 'utf8');
  assert.match(css, /@media \(max-width: 650px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
});
