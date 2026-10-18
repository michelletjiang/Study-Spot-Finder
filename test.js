// Smoke checks for Study Spot Finder. Run: node test.js
// Covers the two things that were actually broken: views rendering without the
// `user` local, and route/auth wiring (including a route that used to hang).
// Smoke test: every view must render with the locals its controller passes,
// plus res.locals.user supplied globally by server.js.
const ejs = require('ejs');
const fs = require('fs');
const assert = require('assert');

const admin = { id: 'a1', username: 'adminuser', email: 'a@b.com', school: ['SCIS'], role: 'Admin', createdAt: new Date() };
const student = { ...admin, username: 'student1', role: 'Student' };

const review = { _id: 'r1', buildingName: 'SOE', userId: 'student1', roomId: 'Room A', title: 't', content: 'c', rating: 4 };
const spot = { _id: 's1', buildingName: 'SOE', name: 'Room A', floor: '2', seatCount: 10, hasPowerSocket: true, noiseLevel: 'Quiet' };
const building = { _id: 'b1', buildingname: 'SOE', floors: 5, postal: 178899 };
const report = { _id: 'p1', reviewId: review, reportedBy: 'student1', description: 'd', reason: 'Spam', status: 'Pending' };
const fav = { _id: 'f1', userName: 'student1', spotName: 'Room A', buildingName: 'SOE', floor: '2', seatCount: 10, hasPowerSocket: true, noiseLevel: 'Quiet' };

// [view, locals] pairs mirroring the real res.render calls
const cases = [
  ['home', { buildings: [building] }],
  ['home', { buildings: [] }],
  ['building-spots', { buildingname: 'SOE', studySpots: [spot] }],
  ['building-spots', { buildingname: 'SOE', studySpots: [] }],
  ['favourites', { favourites: [fav] }],
  ['favourites', { favourites: [] }],
  ['add-building', { result: '', msg: 'All Fields Are Required.' }],
  ['add-building', { result: building, msg: '' }],
  ['edit-building', { buildings: [building] }],
  ['update-building', { result: building }],
  ['update-building', { result: null, msg: 'Enter Valid Floor.' }],
  ['delete-building', { result: building }],
  ['studyspot-list', { studySpotList: [spot] }],
  ['studyspot-details', { result: spot }],
  ['add-studyspot', { buildings: [building], result: '', msg: '' }],
  ['edit-studyspot', { result: spot }],
  ['delete-studyspot', { result: spot }],
  ['display-reviews', { reviewList: [review], building: 'SOE' }],
  ['display-reviews', { reviewList: [], building: 'SOE' }],
  ['add-review', { result: null, msg: '', spotName: 'Room A', building: 'SOE' }],
  ['user-reviews', { reviewList: [review] }],
  ['update-review', { result: review, msg: '', building: 'SOE', spotName: 'Room A' }],
  ['show-marked-review', { result: review, msg: '' }],
  ['new-report', { review, msg: '' }],
  ['report-outcome', { result: report, msg: '', report, reviewText: 'c', reportId: 'p1' }],
  ['edit-report', { report, msg: '' }],
  ['admin-reports', { reports: [report] }],
  ['admin-reports', { reports: [] }],
  ['admin-reports', { reports: [{ ...report, reviewId: null }] }],  // review deleted
  ['profile', { session: {}, user: student, adminRequest: null }],
  ['admin-profile', { session: {}, user: admin, pendingRequests: [{ _id: 'q1', username: 'student1', createdAt: new Date() }] }],
  ['edit-profile', { session: {}, user: student, error: [] }],
  ['login', { session: {}, error: [] }],
  ['register', { session: {}, error: ['x'] }],
  ['error', { message: 'oops' }],
];

function checkViews() {
let fails = 0;
for (const [view, locals] of cases) {
  for (const who of [admin, student]) {
    // user comes from res.locals unless the controller passes its own
    const data = { user: who, ...locals };
    try {
      ejs.render(fs.readFileSync(`views/${view}.ejs`, 'utf8'), data, { filename: `views/${view}.ejs` });
    } catch (e) {
      fails++;
      console.log(`FAIL ${view} (as ${who.role}): ${e.message.split('\n').pop().trim()}`);
    }
  }
}
assert.strictEqual(fails, 0, `${fails} view render failure(s)`);
console.log(`all ${cases.length * 2} view renders OK`);
}

function checkRoutes() {
const express = require('express');
const session = require('express-session');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use((req, res, next) => { res.locals.user = req.session.user; next(); });
for (const r of ['user-routes','buildings-routes','studyspot-routes','reviews-route','report-routes','admin-request-routes','favourites-routes']) {
    app.use('/', require('./routes/' + r));
}

const expected = [
    ['GET',  '/login',            200],
    ['GET',  '/register',         200],
    ['GET',  '/',                 302],  // isLoggedIn -> /login
    ['GET',  '/favourites',       302],
    ['GET',  '/profile',          302],
    ['GET',  '/studyspot-list',   302],  // isAdmin -> /login
    ['GET',  '/admin/reports',    302],
    ['GET',  '/reviews',          302],  // used to hang forever
    ['GET',  '/admin',            404],  // dead route removed
    ['GET',  '/delete-review',    302],  // ownership guard sits behind isLoggedIn
    ['POST', '/delete',           302],  // now guarded
    ['POST', '/favourites/add',    302],  // mutations are POST-only now
    ['POST', '/favourites/remove', 302],
    ['GET',  '/favourites/add',    404],  // the old state-changing GET is gone
    ['GET',  '/favourites/remove', 404],
];

const server = app.listen(0, async () => {
    const base = 'http://localhost:' + server.address().port;
    let fails = 0;
    for (const [method, path, want] of expected) {
        // a hang would show up as this timing out, which is the bug we fixed
        const res = await fetch(base + path, { method, redirect: 'manual', signal: AbortSignal.timeout(4000) })
            .catch(e => ({ status: 'ERROR: ' + e.message }));
        if (res.status !== want) {
            fails++;
            console.log(`FAIL ${method} ${path}: got ${res.status}, want ${want}`);
        }
    }
    server.close();
    assert.strictEqual(fails, 0, `${fails} route failure(s)`);
    console.log(`all ${expected.length} routes OK`);
});

}

// Guard against the original bug coming back: without `user`, these must throw.
function checkViewsFailWithoutUser() {
    for (const view of ['favourites', 'building-spots', 'admin-reports', 'studyspot-list']) {
        assert.throws(
            () => ejs.render(fs.readFileSync(`views/${view}.ejs`, 'utf8'),
                { favourites: [], studySpots: [], buildingname: 'X', reports: [], studySpotList: [] }),
            /user is not defined/,
            `${view} should still depend on the user local`
        );
    }
    console.log('missing-user regression check OK');
}

checkViews();
checkViewsFailWithoutUser();
checkRoutes();
