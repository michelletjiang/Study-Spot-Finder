// ACTIVE: review-report JSON routes, mounted at /api/reports.
const express = require('express');

// Controller with the apiXxx handlers for reports.
const reportController = require('../../controllers/report-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// Routes for any logged-in user.
// any logged-in user
// POST creates a report about a review.
router.post('/', auth.apiLoggedIn, reportController.apiCreateReport);
// GET /pending lists reports waiting for moderation (admin only). It is declared before /:id so the word "pending" is not read as an id.
router.get('/pending', auth.apiAdmin, reportController.apiPendingReports); // before /:id
// GET /mine lists the logged-in user's own reports, newest first (also before /:id).
router.get('/mine', auth.apiLoggedIn, reportController.apiMyReports);
// GET /:id reads one report.
router.get('/:id', auth.apiLoggedIn, reportController.apiGetReport);
// PUT /:id lets the reporter edit their report.
router.put('/:id', auth.apiLoggedIn, reportController.apiUpdateReport);

// Routes only an admin can use.
// admin only
// POST approves a report.
router.post('/:id/approve', auth.apiAdmin, reportController.apiApproveReport);
// POST declines a report.
router.post('/:id/decline', auth.apiAdmin, reportController.apiDeclineReport);

// Export for routes/api/index.js.
module.exports = router;
