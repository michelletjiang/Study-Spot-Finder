// cascade-service.spec.js
// Unit tests (Vitest) for services/cascade-service.js.
//
// The cascade service decides WHICH child records are removed when a parent is deleted
// and in WHAT ORDER. To test only that logic, every model call is replaced with a spy
// (vi.spyOn) that records its arguments instead of touching MongoDB. So these tests need
// no database and give the same result every run.
//
// Run: npm run test:unit

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'node:module'

// The app is CommonJS, so load it with require(). The service and these tests then share
// the same model objects, which is what lets vi.spyOn replace their functions.
const require = createRequire(import.meta.url)
const Building = require('../../models/building-model')
const StudySpot = require('../../models/studyspot-model')
const Review = require('../../models/reviews-model')
const Report = require('../../models/reports')
const Favourite = require('../../models/favourites-model')
const AdminRequest = require('../../models/admin-request-model')
const CheckIn = require('../../models/checkin-model')
const StudySpotAlert = require('../../models/studyspot-alert-model')
const cascade = require('../../services/cascade-service')

// Every call made to a spied model function is pushed here as "Model.function",
// so a test can check the order of the deletes.
let calls

// Replace obj[fn] with a spy that records the call and resolves to `result`.
function stub(obj, label, fn, result = { deletedCount: 1 }) {
  return vi.spyOn(obj, fn).mockImplementation(async () => {
    calls.push(`${label}.${fn}`)
    return result
  })
}

// Fixtures: one spot, one building and one user, with two reviews on the spot.
const spot = { _id: 'spot1', name: 'Pod A', buildingName: 'SCIS1', floor: '3', seatCount: 6, hasPowerSocket: true, noiseLevel: 'Quiet' }
const building = { postal: '178902', buildingname: 'SCIS1' }
const user = { id: 'user1', username: 'ziyuzhang' }
const twoReviews = [{ _id: 'rev1' }, { _id: 'rev2' }]

beforeEach(() => {
  calls = []
})

afterEach(() => {
  // Put the real model functions back so tests do not affect each other.
  vi.restoreAllMocks()
})

describe('TestSuite1: deleteReview', () => {
  it('Test1: deletes the reports on the review, then the review', async () => {
    const reports = stub(Report, 'Report', 'deleteByReview')
    const review = stub(Review, 'Review', 'deleteReview')

    await cascade.deleteReview('rev1')

    expect(reports).toHaveBeenCalledWith('rev1')
    expect(review).toHaveBeenCalledWith('rev1')
    // Children first, so a failure never leaves a report pointing at a deleted review.
    expect(calls).toEqual(['Report.deleteByReview', 'Review.deleteReview'])
  })
})

describe('TestSuite2: deleteSpot', () => {
  it('Test1: removes reviews, their reports and favourites of that spot only', async () => {
    const find = stub(Review, 'Review', 'findByRoom', twoReviews)
    const reports = stub(Report, 'Report', 'deleteByReviews')
    const reviews = stub(Review, 'Review', 'deleteByRoom')
    const favs = stub(Favourite, 'Favourite', 'deleteBySpot')
    const crowd = stub(CheckIn, 'CheckIn', 'deleteMany')
    const alerts = stub(StudySpotAlert, 'StudySpotAlert', 'deleteMany')
    const del = stub(StudySpot, 'StudySpot', 'deleteSpot')

    await cascade.deleteSpot(spot)

    // Check-ins and alerts are matched by the spot's ObjectId.
    expect(crowd).toHaveBeenCalledWith({ spot: { $in: ['spot1'] } })
    expect(alerts).toHaveBeenCalledWith({ spot: { $in: ['spot1'] } })
    // Reviews and favourites are matched by building + spot name.
    expect(find).toHaveBeenCalledWith('SCIS1', 'Pod A')
    expect(reports).toHaveBeenCalledWith(['rev1', 'rev2'])
    expect(reviews).toHaveBeenCalledWith('SCIS1', 'Pod A')
    expect(favs).toHaveBeenCalledWith('SCIS1', 'Pod A')
    expect(del).toHaveBeenCalledWith('spot1')
  })

  it('Test2: deletes the spot itself last', async () => {
    stub(Review, 'Review', 'findByRoom', twoReviews)
    stub(Report, 'Report', 'deleteByReviews')
    stub(Review, 'Review', 'deleteByRoom')
    stub(Favourite, 'Favourite', 'deleteBySpot')
    stub(CheckIn, 'CheckIn', 'deleteMany')
    stub(StudySpotAlert, 'StudySpotAlert', 'deleteMany')
    stub(StudySpot, 'StudySpot', 'deleteSpot')

    await cascade.deleteSpot(spot)

    expect(calls.at(-1)).toBe('StudySpot.deleteSpot')
    // Reports go before the reviews they point at.
    expect(calls.indexOf('Report.deleteByReviews')).toBeLessThan(calls.indexOf('Review.deleteByRoom'))
  })

  it('Test3: still works when the spot has no reviews', async () => {
    stub(Review, 'Review', 'findByRoom', [])
    const reports = stub(Report, 'Report', 'deleteByReviews')
    stub(Review, 'Review', 'deleteByRoom')
    stub(Favourite, 'Favourite', 'deleteBySpot')
    stub(CheckIn, 'CheckIn', 'deleteMany')
    stub(StudySpotAlert, 'StudySpotAlert', 'deleteMany')
    const del = stub(StudySpot, 'StudySpot', 'deleteSpot')

    await cascade.deleteSpot(spot)

    expect(reports).toHaveBeenCalledWith([])
    expect(del).toHaveBeenCalledTimes(1)
  })
})

describe('TestSuite3: deleteBuilding', () => {
  it('Test1: removes everything under the building, then the building by postal code', async () => {
    const find = stub(Review, 'Review', 'findByBuilding', twoReviews)
    const reports = stub(Report, 'Report', 'deleteByReviews')
    const reviews = stub(Review, 'Review', 'deleteByBuilding')
    const favs = stub(Favourite, 'Favourite', 'deleteByBuilding')
    stub(StudySpot, 'StudySpot', 'findByBuilding', [{ _id: 'spot1' }, { _id: 'spot2' }])
    const crowd = stub(CheckIn, 'CheckIn', 'deleteMany')
    const alerts = stub(StudySpotAlert, 'StudySpotAlert', 'deleteMany')
    const spots = stub(StudySpot, 'StudySpot', 'deleteByBuilding')
    const del = stub(Building, 'Building', 'deleteBuilding')

    await cascade.deleteBuilding(building)

    expect(find).toHaveBeenCalledWith('SCIS1')
    expect(reports).toHaveBeenCalledWith(['rev1', 'rev2'])
    expect(reviews).toHaveBeenCalledWith('SCIS1')
    expect(favs).toHaveBeenCalledWith('SCIS1')
    expect(crowd).toHaveBeenCalledWith({ spot: { $in: ['spot1', 'spot2'] } })
    expect(alerts).toHaveBeenCalledWith({ spot: { $in: ['spot1', 'spot2'] } })
    expect(spots).toHaveBeenCalledWith('SCIS1')
    expect(del).toHaveBeenCalledWith('178902')
    expect(calls.at(-1)).toBe('Building.deleteBuilding')
  })
})

describe('TestSuite4: deleteUserData', () => {
  it('Test1: removes the user\'s reviews (and reports on them), favourites, admin requests, check-ins and alerts', async () => {
    const find = stub(Review, 'Review', 'findbyUser', twoReviews)
    const reports = stub(Report, 'Report', 'deleteByReviews')
    const reviews = stub(Review, 'Review', 'deleteByUser')
    const reviewVotes = stub(Review, 'Review', 'removeVotesByUser')
    const favs = stub(Favourite, 'Favourite', 'deleteByUser')
    const requests = stub(AdminRequest, 'AdminRequest', 'deleteByUser')
    const crowd = stub(CheckIn, 'CheckIn', 'deleteMany')
    const alerts = stub(StudySpotAlert, 'StudySpotAlert', 'deleteMany')
    const votes = stub(StudySpotAlert, 'StudySpotAlert', 'updateMany')

    await cascade.deleteUserData(user)

    // Reviews and favourites store the username; admin requests store the user's ObjectId.
    expect(find).toHaveBeenCalledWith('ziyuzhang')
    expect(reports).toHaveBeenCalledWith(['rev1', 'rev2'])
    expect(reviews).toHaveBeenCalledWith('ziyuzhang')
    // Their up/downvotes on other people's reviews are removed too.
    expect(reviewVotes).toHaveBeenCalledWith('ziyuzhang')
    expect(favs).toHaveBeenCalledWith('ziyuzhang')
    expect(requests).toHaveBeenCalledWith('user1')
    expect(crowd).toHaveBeenCalledWith({ userId: 'user1' })
    expect(alerts).toHaveBeenCalledWith({ userId: 'user1' })
    // Their confirm/dispute votes on other people's alerts are removed too.
    expect(votes).toHaveBeenCalledWith({}, { $pull: { confirms: 'user1', disputes: 'user1' } })
  })
})

describe('TestSuite5: syncSpotEdit', () => {
  it('Test1: renaming a spot moves its reviews and updates favourites', async () => {
    const favs = stub(Favourite, 'Favourite', 'updateSpotDetails')
    const rename = stub(Review, 'Review', 'renameRoom')
    const updated = { name: 'Pod B', floor: '4', seatCount: 8, hasPowerSocket: false, noiseLevel: 'Moderate' }

    await cascade.syncSpotEdit(spot, updated)

    expect(favs).toHaveBeenCalledWith('SCIS1', 'Pod A', {
      spotName: 'Pod B', floor: '4', seatCount: 8, hasPowerSocket: false, noiseLevel: 'Moderate'
    })
    expect(rename).toHaveBeenCalledWith('SCIS1', 'Pod A', 'Pod B')
  })

  it('Test2: keeping the same name does not touch reviews', async () => {
    stub(Favourite, 'Favourite', 'updateSpotDetails')
    const rename = stub(Review, 'Review', 'renameRoom')

    await cascade.syncSpotEdit(spot, { ...spot, seatCount: 10 })

    expect(rename).not.toHaveBeenCalled()
  })
})

describe('TestSuite6: renameUser', () => {
  it('Test1: moves reviews, reports and favourites to the new username', async () => {
    const reviews = stub(Review, 'Review', 'renameUser')
    const reports = stub(Report, 'Report', 'renameReporter')
    const favs = stub(Favourite, 'Favourite', 'renameUser')

    await cascade.renameUser('ziyuzhang', 'ziyu_z')

    expect(reviews).toHaveBeenCalledWith('ziyuzhang', 'ziyu_z')
    expect(reports).toHaveBeenCalledWith('ziyuzhang', 'ziyu_z')
    expect(favs).toHaveBeenCalledWith('ziyuzhang', 'ziyu_z')
  })
})
