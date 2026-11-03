// TEST: checks that the comparison source files still contain their key rules. These checks read the files as text, so they are guards against accidental edits, not behaviour tests. The behaviour is tested in compare-runtime.test.js.
// node:test is Node's built-in test runner.
const test = require('node:test');
// assert/strict compares values exactly.
const assert = require('node:assert/strict');
// fs reads the source files.
const fs = require('node:fs');
// The id parser used by the server.
const { parseComparisonIds } = require('../lib/compare');

// The three-spot cap, the unique-ids rule and the length check must still be in the shortlist rules file.
test('selection caps at three, removes, and restores unique URL ids', () => {
  // Read the file as text.
  const source = fs.readFileSync('client/src/stores/compare-selection.js', 'utf8');
  assert.match(source, /MAX_COMPARISON_SPOTS = 3/);
  assert.match(source, /new Set\(ids\.map\(String\)\)/);
  assert.match(source, /ids\.length < MAX_COMPARISON_SPOTS/);
});

// The compare page must watch the ids in the URL, update the URL on removal and have a Remove button wired up.
test('comparison route exposes removal and query-watching behavior', () => {
  const source = fs.readFileSync('client/src/views/CompareView.vue', 'utf8');
  assert.match(source, /watch\(\(\) => String\(route\.query\.ids/);
  assert.match(source, /router\.replace/);
  assert.match(source, /@click="removeSpot/);
});

// The server must do a single batched lookup, keep the requested order, list missing ids, and only select the catalogue fields it needs.
test('API performs one projected batch lookup, preserves order, and reports missing IDs', () => {
  const controller = fs.readFileSync('controllers/studyspot-controller.js', 'utf8');
  const model = fs.readFileSync('models/studyspot-model.js', 'utf8');
  assert.match(controller, /StudySpot\.findByIds\(ids\)/);
  assert.match(controller, /missingIds: ids\.filter/);
  assert.match(model, /StudySpot\.find\(\{ _id: \{ \$in: ids \} \}\)/);
  assert.match(model, /\.select\('_id name buildingName floor seatCount hasPowerSocket noiseLevel'\)/);
  assert.match(model, /\.lean\(\)/);
});

// The id parser must reject bad, duplicate and four-item lists, and must normalise upper-case ids to lower case.
test('API parser rejects malformed, duplicate, and four-item selections', () => {
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439012').valid, true);
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439011').valid, false);
  assert.equal(parseComparisonIds('507F1F77BCF86CD799439011,507f1f77bcf86cd799439011').valid, false);
  assert.deepEqual(
    parseComparisonIds('507F1F77BCF86CD799439011,507F1F77BCF86CD799439012').ids,
    ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  );
  assert.equal(parseComparisonIds('507f1f77bcf86cd799439011,507f1f77bcf86cd799439012,507f1f77bcf86cd799439013,507f1f77bcf86cd799439014').valid, false);
});

// The compare page must have narrow-screen rules: on a phone the table scrolls inside its sheet with the row labels pinned.
test('comparison layout includes a narrow-screen breakpoint', () => {
  const view = fs.readFileSync('client/src/views/CompareView.vue', 'utf8');
  assert.match(view, /@media \(max-width: 650px\)/);
  assert.match(view, /position: sticky; left: 0/);
});
