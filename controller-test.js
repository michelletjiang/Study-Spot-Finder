const assert = require('assert');

const Favourite = require('./models/favourites-model');
const Report = require('./models/reports');
const Review = require('./models/reviews-model');
const StudySpot = require('./models/studyspot-model');
const authentication = require('./middleware/auth-middleware');
const favouritesController = require('./controllers/favourites-controller');
const reportController = require('./controllers/report-controller');

const originals = {
  favouriteFind: Favourite.findByUserAndSpotAndBuilding,
  favouriteAdd: Favourite.addFavourite,
  reportFindById: Report.findById,
  reportEdit: Report.editReport,
  reportFind: Report.find,
  reportUpdateMany: Report.updateMany,
  reviewFindById: Review.findByreviewId,
  reviewDelete: Review.deleteReview,
  studySpotFindById: StudySpot.findById,
};

function restoreModels() {
  Favourite.findByUserAndSpotAndBuilding = originals.favouriteFind;
  Favourite.addFavourite = originals.favouriteAdd;
  Report.findById = originals.reportFindById;
  Report.editReport = originals.reportEdit;
  Report.find = originals.reportFind;
  Report.updateMany = originals.reportUpdateMany;
  Review.findByreviewId = originals.reviewFindById;
  Review.deleteReview = originals.reviewDelete;
  StudySpot.findById = originals.studySpotFindById;
}

function responseRecorder() {
  const calls = [];
  return {
    calls,
    status(code) {
      calls.push(['status', code]);
      return this;
    },
    render(view, data) {
      calls.push(['render', view, data]);
      return this;
    },
    redirect(path) {
      calls.push(['redirect', path]);
      return this;
    },
    send(body) {
      calls.push(['send', body]);
      return this;
    },
  };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } finally {
    restoreModels();
  }
}

async function run() {
  await test('report submission handles review lookup failure', async () => {
    Review.findByreviewId = async () => { throw new Error('database unavailable'); };
    const res = responseRecorder();

    await reportController.uploadReport({
      params: { reviewId: 'r1' },
      body: { reason: 'Spam', description: 'Repeated advert' },
      session: { user: { username: 'student1' } },
    }, res);

    assert.deepStrictEqual(res.calls[0].slice(0, 2), ['render', 'error']);
  });

  await test('report update responds when the database write fails', async () => {
    Report.findById = async () => ({ _id: 'p1', status: 'Pending', reportedBy: 'student1' });
    Report.editReport = async () => { throw new Error('database unavailable'); };
    const res = responseRecorder();

    await reportController.updateReport({
      params: { reportId: 'p1' },
      body: { reason: 'Spam', description: 'Repeated advert' },
    }, res);

    assert.deepStrictEqual(res.calls.at(-1).slice(0, 2), ['render', 'error']);
  });

  await test('report update handles report lookup failure', async () => {
    Report.findById = async () => { throw new Error('database unavailable'); };
    const res = responseRecorder();

    await reportController.updateReport({
      params: { reportId: 'p1' },
      body: { reason: 'Spam', description: 'Repeated advert' },
    }, res);

    assert.deepStrictEqual(res.calls.at(-1).slice(0, 2), ['render', 'error']);
  });

  await test('approved report cannot open the edit form', async () => {
    Report.findById = async () => ({ _id: 'p1', status: 'Approved', reportedBy: 'student1' });
    const res = responseRecorder();

    await reportController.editReport({ params: { reportId: 'p1' } }, res);

    assert.deepStrictEqual(res.calls, [
      ['status', 409],
      ['render', 'error', { message: 'Only pending reports can be edited.' }],
    ]);
  });

  await test('declined report cannot be updated', async () => {
    Report.findById = async () => ({ _id: 'p1', status: 'Declined', reportedBy: 'student1' });
    let edited = false;
    Report.editReport = async () => { edited = true; };
    const res = responseRecorder();

    await reportController.updateReport({
      params: { reportId: 'p1' },
      body: { reason: 'Spam', description: 'Changed text' },
    }, res);

    assert.strictEqual(edited, false);
    assert.deepStrictEqual(res.calls, [
      ['status', 409],
      ['render', 'error', { message: 'Only pending reports can be edited.' }],
    ]);
  });

  await test('favourite copies canonical study spot data', async () => {
    StudySpot.findById = async () => ({
      _id: 's1',
      name: 'Library Level 2',
      buildingName: 'Li Ka Shing Library',
      floor: '2',
      seatCount: 80,
      hasPowerSocket: true,
      noiseLevel: 'Quiet',
    });
    Favourite.findByUserAndSpotAndBuilding = async () => null;
    let saved;
    Favourite.addFavourite = async value => { saved = value; };
    const res = responseRecorder();

    await favouritesController.addFavourite({
      session: { user: { username: 'student1' } },
      body: {
        spotId: 's1',
        spotName: 'Fake spot',
        buildingName: 'Fake building',
        floor: '999',
        seatCount: '99999',
        hasPowerSocket: 'false',
        noiseLevel: 'Fake',
      },
    }, res);

    assert.deepStrictEqual(saved, {
      userName: 'student1',
      spotName: 'Library Level 2',
      buildingName: 'Li Ka Shing Library',
      floor: '2',
      seatCount: 80,
      hasPowerSocket: true,
      noiseLevel: 'Quiet',
    });
    assert.deepStrictEqual(res.calls.at(-1), ['redirect', '/building/Li%20Ka%20Shing%20Library']);
  });

  await test('missing study spot cannot be added to favourites', async () => {
    StudySpot.findById = async () => null;
    let created = false;
    Favourite.addFavourite = async () => { created = true; };
    const res = responseRecorder();

    await favouritesController.addFavourite({
      session: { user: { username: 'student1' } },
      body: { spotId: 'missing' },
    }, res);

    assert.strictEqual(created, false);
    assert.deepStrictEqual(res.calls.at(-1).slice(0, 2), ['render', 'error']);
  });

  await test('ownership guard rejects another user', async () => {
    const guard = authentication.owns(
      req => req.params.id,
      async () => ({ userName: 'owner' }),
      item => item.userName,
    );
    const res = responseRecorder();
    let nextCalled = false;

    await guard(
      { params: { id: 'f1' }, session: { user: { username: 'intruder' } } },
      res,
      () => { nextCalled = true; },
    );

    assert.strictEqual(nextCalled, false);
    assert.deepStrictEqual(res.calls[0], ['status', 403]);
  });

  await test('admin guard rejects a logged-in student', async () => {
    const res = responseRecorder();
    let nextCalled = false;

    authentication.isAdmin(
      { session: { user: { username: 'student1', role: 'Student' } } },
      res,
      () => { nextCalled = true; },
    );

    assert.strictEqual(nextCalled, false);
    assert.deepStrictEqual(res.calls[0], ['redirect', '/profile']);
  });

  await test('admin approval deletes the review and closes matching reports', async () => {
    Report.findById = async () => ({ _id: 'p1', reviewId: 'r1', status: 'Pending' });
    Report.find = () => ({ populate: async () => [] });
    let deletedReview;
    let update;
    Review.deleteReview = async id => { deletedReview = id; };
    Report.updateMany = async (query, changes) => { update = { query, changes }; };
    const res = responseRecorder();

    await reportController.updateAdminDisplayReports({
      body: { reportId: 'p1', action: 'approve' },
    }, res);

    assert.strictEqual(deletedReview, 'r1');
    assert.deepStrictEqual(update, {
      query: { reviewId: 'r1' },
      changes: { status: 'Approved' },
    });
    assert.deepStrictEqual(res.calls.at(-1).slice(0, 2), ['render', 'admin-reports']);
  });

  await test('admin moderation handles report lookup failure', async () => {
    Report.findById = async () => { throw new Error('database unavailable'); };
    const res = responseRecorder();

    await reportController.updateAdminDisplayReports({
      body: { reportId: 'p1', action: 'approve' },
    }, res);

    assert.deepStrictEqual(res.calls.at(-1).slice(0, 2), ['render', 'error']);
  });

  await test('admin decline keeps the review and closes matching reports', async () => {
    Report.findById = async () => ({ _id: 'p1', reviewId: 'r1', status: 'Pending' });
    Report.find = () => ({ populate: async () => [] });
    let deleted = false;
    let update;
    Review.deleteReview = async () => { deleted = true; };
    Report.updateMany = async (query, changes) => { update = { query, changes }; };
    const res = responseRecorder();

    await reportController.updateAdminDisplayReports({
      body: { reportId: 'p1', action: 'decline' },
    }, res);

    assert.strictEqual(deleted, false);
    assert.deepStrictEqual(update, {
      query: { reviewId: 'r1' },
      changes: { status: 'Declined' },
    });
    assert.deepStrictEqual(res.calls.at(-1).slice(0, 2), ['render', 'admin-reports']);
  });

  console.log('all controller regression checks OK');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
