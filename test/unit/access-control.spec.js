// access-control.spec.js
// Unit tests (Vitest) for who may change reviews, reports and favourites.
//
// The JSON API already checked ownership, but the old EJS routes (still mounted in server.js)
// did not: any logged-in student could edit or delete another student's review, remove their
// favourites or rewrite their reports. These tests call those handlers directly with a fake
// request and response, and replace every model call with a spy, so no database is needed.
//
// Run: npm run test:unit

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Review = require('../../models/reviews-model')
const Report = require('../../models/reports')
const Favourite = require('../../models/favourites-model')
const Building = require('../../models/building-model')
const StudySpot = require('../../models/studyspot-model')
const CheckIn = require('../../models/checkin-model')
const StudySpotAlert = require('../../models/studyspot-alert-model')
const NoiseReport = require('../../models/noise-report-model')
const cascade = require('../../services/cascade-service')
const reviewsController = require('../../controllers/reviews-controller')
const reportController = require('../../controllers/report-controller')
const favouritesController = require('../../controllers/favourites-controller')
const nearbyController = require('../../controllers/nearby-controller')
const { canEditReview, canDeleteReview, canEditReport, validateReportTarget } = require('../../lib/reviews')

// Fixtures. Ids are valid ObjectId strings because the handlers check the format first.
const REVIEW_ID = '64b000000000000000000001'
const REPORT_ID = '64b000000000000000000002'
const FAV_ID = '64b000000000000000000003'
const aliceReview = { _id: REVIEW_ID, userId: 'alice', buildingName: 'SCIS 1', roomId: 'Lounge', title: 'Nice', content: 'Quiet', rating: 4 }
const alice = { username: 'alice', role: 'Student' }
const bob = { username: 'bob', role: 'Student' }
const admin = { username: 'boss', role: 'Admin' }

// A fake Express response that records what the handler did.
function fakeRes() {
  const res = { statusCode: 200 }
  res.status = vi.fn(code => { res.statusCode = code; return res })
  for (const fn of ['send', 'json', 'render', 'redirect', 'end']) res[fn] = vi.fn(() => res)
  return res
}
const fakeReq = (user, extra = {}) => ({ session: { user }, params: {}, query: {}, body: {}, ...extra })

afterEach(() => vi.restoreAllMocks())

describe('TestSuite1: permission rules', () => {
  it('Test1: only the author may edit a review', () => {
    expect(canEditReview(aliceReview, alice)).toBe(true)
    expect(canEditReview(aliceReview, bob)).toBe(false)
    expect(canEditReview(aliceReview, admin)).toBe(false)
    expect(canEditReview(aliceReview, undefined)).toBe(false)
  })

  it('Test2: the author or an admin may delete a review', () => {
    expect(canDeleteReview(aliceReview, alice)).toBe(true)
    expect(canDeleteReview(aliceReview, admin)).toBe(true)
    expect(canDeleteReview(aliceReview, bob)).toBe(false)
  })

  it('Test3: only the reporter may edit a report, and only while it is pending', () => {
    const report = { reportedBy: 'bob', status: 'Pending' }
    expect(canEditReport(report, bob)).toBe(true)
    expect(canEditReport(report, alice)).toBe(false)
    expect(canEditReport({ ...report, status: 'Approved' }, bob)).toBe(false)
  })

  it('Test4: you cannot report your own review, or report the same review twice', () => {
    expect(validateReportTarget(aliceReview, 'bob', false)).toBeNull()
    expect(validateReportTarget(aliceReview, 'alice', false)).toBe('You cannot report your own review.')
    expect(validateReportTarget(aliceReview, 'bob', true)).toBe('You have already reported this review.')
  })
})

describe('TestSuite2: legacy review pages enforce ownership', () => {
  let edit, del
  beforeEach(() => {
    vi.spyOn(Review, 'findByreviewId').mockResolvedValue({ ...aliceReview })
    edit = vi.spyOn(Review, 'editReview').mockResolvedValue({})
    del = vi.spyOn(cascade, 'deleteReview').mockResolvedValue({})
  })

  it('Test1: another student cannot edit the review (403, nothing saved)', async () => {
    const res = fakeRes()
    await reviewsController.updateReview(fakeReq(bob, { params: { reviewId: REVIEW_ID }, body: { title: 'HACKED', content: 'x', rating: '1' } }), res)
    expect(res.statusCode).toBe(403)
    expect(edit).not.toHaveBeenCalled()
  })

  it('Test2: the author can still edit, and the page gets the user it needs', async () => {
    const res = fakeRes()
    await reviewsController.updateReview(fakeReq(alice, { params: { reviewId: REVIEW_ID }, body: { title: 'New', content: 'Still quiet', rating: '5' } }), res)
    expect(edit).toHaveBeenCalledWith(REVIEW_ID, 'New', 'Still quiet', 5)
    expect(res.render).toHaveBeenCalledWith('update-review', expect.objectContaining({ user: alice }))
  })

  it('Test3: a blank field stops before saving', async () => {
    const res = fakeRes()
    await reviewsController.updateReview(fakeReq(alice, { params: { reviewId: REVIEW_ID }, body: { title: '', content: 'x', rating: '3' } }), res)
    expect(edit).not.toHaveBeenCalled()
    expect(res.render).toHaveBeenCalledWith('update-review', expect.objectContaining({ msg: 'All fields are required.' }))
  })

  it('Test4: another student cannot delete the review (403, nothing deleted)', async () => {
    const res = fakeRes()
    await reviewsController.deleteAReview(fakeReq(bob, { body: { id: REVIEW_ID } }), res)
    expect(res.statusCode).toBe(403)
    expect(del).not.toHaveBeenCalled()
  })

  it('Test5: an admin can delete it, and its reports go with it', async () => {
    const res = fakeRes()
    await reviewsController.deleteAReview(fakeReq(admin, { body: { id: REVIEW_ID } }), res)
    expect(del).toHaveBeenCalledWith(REVIEW_ID)
    expect(res.redirect).toHaveBeenCalledWith('/review-list/SCIS%201/Lounge')
  })
})

describe('TestSuite3: legacy favourites and reports enforce ownership', () => {
  it('Test1: removing a favourite is limited to the logged-in user', async () => {
    const forUser = vi.spyOn(Favourite, 'removeFavouriteForUser').mockResolvedValue({ deletedCount: 0 })
    const anyone = vi.spyOn(Favourite, 'removeFavourite').mockResolvedValue({ deletedCount: 1 })
    await favouritesController.removeFavourite(fakeReq(bob, { query: { favId: FAV_ID } }), fakeRes())
    expect(forUser).toHaveBeenCalledWith(FAV_ID, 'bob')
    expect(anyone).not.toHaveBeenCalled()
  })

  it('Test2: another student cannot edit a report (403, nothing saved)', async () => {
    vi.spyOn(Report, 'findById').mockResolvedValue({ _id: REPORT_ID, reportedBy: 'carol', status: 'Pending' })
    const save = vi.spyOn(Report, 'editReport').mockResolvedValue({})
    const res = fakeRes()
    await reportController.updateReport(fakeReq(bob, { params: { reportId: REPORT_ID }, body: { reason: 'Spam', description: 'changed' } }), res)
    expect(res.statusCode).toBe(403)
    expect(save).not.toHaveBeenCalled()
  })

  it('Test3: a report an admin already approved cannot be edited, even by its reporter', async () => {
    vi.spyOn(Report, 'findById').mockResolvedValue({ _id: REPORT_ID, reportedBy: 'bob', status: 'Approved' })
    const save = vi.spyOn(Report, 'editReport').mockResolvedValue({})
    const res = fakeRes()
    await reportController.updateReport(fakeReq(bob, { params: { reportId: REPORT_ID }, body: { reason: 'Spam', description: 'changed' } }), res)
    expect(res.statusCode).toBe(403)
    expect(save).not.toHaveBeenCalled()
  })
})

describe('TestSuite4: POST /api/reports', () => {
  let add
  beforeEach(() => {
    vi.spyOn(Review, 'findByreviewId').mockResolvedValue({ ...aliceReview })
    add = vi.spyOn(Report, 'addReport').mockResolvedValue({ _id: REPORT_ID })
  })
  const body = { reviewId: REVIEW_ID, reason: 'Spam', description: 'Advert' }

  it('Test1: the author cannot report their own review (403)', async () => {
    vi.spyOn(Report, 'exists').mockResolvedValue(null)
    const res = fakeRes()
    await reportController.apiCreateReport(fakeReq(alice, { body }), res)
    expect(res.statusCode).toBe(403)
    expect(add).not.toHaveBeenCalled()
  })

  it('Test2: a second pending report from the same student is refused (409)', async () => {
    vi.spyOn(Report, 'exists').mockResolvedValue({ _id: 'old' })
    const res = fakeRes()
    await reportController.apiCreateReport(fakeReq(bob, { body }), res)
    expect(res.statusCode).toBe(409)
    expect(add).not.toHaveBeenCalled()
  })

  it('Test3: a first report from someone else is saved (201)', async () => {
    vi.spyOn(Report, 'exists').mockResolvedValue(null)
    const res = fakeRes()
    await reportController.apiCreateReport(fakeReq(bob, { body }), res)
    expect(res.statusCode).toBe(201)
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ reportedBy: 'bob', status: 'Pending' }))
  })
})

describe('TestSuite5: live noise from checked-in students feeds the find-a-spot ranking', () => {
  beforeEach(() => {
    vi.spyOn(CheckIn, 'find').mockReturnValue({ lean: vi.fn().mockResolvedValue([{ spot: 's1' }]) })
    vi.spyOn(StudySpotAlert, 'find').mockReturnValue({ sort: vi.fn().mockResolvedValue([
      { _id: 'alert1', spot: 's1', type: 'Aircon', resolved: false, expiresAt: new Date(Date.now() + 60000), confirms: [], disputes: [] }
    ]) })
    vi.spyOn(Building, 'retrieveAll').mockResolvedValue([{ buildingname: 'SCIS 1', lat: 1.297, lng: 103.849 }])
    vi.spyOn(StudySpot, 'retrieveAll').mockResolvedValue([
      { _id: 's1', name: 'Lounge', buildingName: 'SCIS 1', noiseLevel: 'Quiet' },
      { _id: 's2', name: 'Pod', buildingName: 'SCIS 1', noiseLevel: 'Moderate' }
    ])
    // Reviewers called the Pod Quiet; that must no longer count.
    vi.spyOn(Review, 'summariseAll').mockResolvedValue([{ _id: { buildingName: 'SCIS 1', roomId: 'Pod' }, count: 2, avgRating: 3, avgNoise: 1 }])
  })

  it('Test1: a spot gets the live noise score, and a spot nobody rated lately is unknown', async () => {
    // Lounge is listed as Quiet, but the student checked in there just rated it Loud (2).
    vi.spyOn(NoiseReport, 'find').mockReturnValue({ sort: () => ({ lean: async () => [
      { spot: 's1', status: 'Loud', createdAt: new Date() }
    ] }) })
    const res = fakeRes()
    await nearbyController.nearby(fakeReq(alice, { body: { latitude: 1.296, longitude: 103.85 } }), res)
    expect(res.statusCode).toBe(200)
    const spots = res.json.mock.calls[0][0].spots
    expect(spots.find(s => s.name === 'Lounge').liveNoise).toBe(2)
    expect(spots.find(s => s.name === 'Lounge').checkedIn).toBe(1)
    expect(spots.find(s => s.name === 'Lounge').alerts).toEqual(['Aircon'])
    // Pod has quiet reviews and a Moderate label, but no live ratings, so its noise is unknown.
    expect(spots.find(s => s.name === 'Pod').liveNoise).toBeNull()
    expect(spots.find(s => s.name === 'Pod').checkedIn).toBe(0)
    expect(spots.find(s => s.name === 'Pod').alerts).toEqual([])
  })
})
