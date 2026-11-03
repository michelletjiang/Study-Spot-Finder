// TEST: GET /api/reports/mine only asks for the logged-in user's reports, and needs a login.
const test = require('node:test');
const assert = require('node:assert/strict');
const Report = require('../models/reports');
const controller = require('../controllers/report-controller');
const auth = require('../middleware/auth-middleware');

function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('lists only the logged-in user\'s reports, newest first', async () => {
  const original = Report.find;
  let query;
  let sort;
  // a fake of Report.find(...).populate(...).sort(...)
  Report.find = q => { query = q; return { populate: () => ({ sort: s => { sort = s; return Promise.resolve([{ _id: 'r1' }]); } }) }; };
  try {
    const res = response();
    await controller.apiMyReports({ session: { user: { username: 'mixue' } } }, res);
    assert.deepEqual(query, { reportedBy: 'mixue' });
    assert.deepEqual(sort, { createdAt: -1 });
    assert.deepEqual(res.body, [{ _id: 'r1' }]);
  } finally {
    Report.find = original;
  }
});

test('needs a login', () => {
  const res = response();
  auth.apiLoggedIn({ session: {} }, res, () => assert.fail('must not call the handler'));
  assert.equal(res.statusCode, 401);
});
