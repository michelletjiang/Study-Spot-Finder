// LEGACY - not used by the Vue demo: old EJS report routes. Replaced by routes/api/reports-routes.js.
const express = require('express');

// Legacy report controller.
const reportController = require('../controllers/report-controller');
// Legacy guards.
const authentication = require('../middleware/auth-middleware');
const router = express.Router();

// Show the report form for a review, then submit it.
router.get('/reports/new/:reviewId',authentication.isLoggedIn, reportController.findReviewforReport);
router.post('/reports/new/:reviewId',authentication.isLoggedIn, reportController.uploadReport);

// Show the edit form for a report, then save it.
router.get('/reports/edit/:reportId',authentication.isLoggedIn, reportController.editReport);
router.post('/reports/edit/:reportId',authentication.isLoggedIn, reportController.updateReport);

// Admin lists reports, then admin acts on them.
router.get('/admin/reports', authentication.isAdmin, reportController.adminDisplayReports);
router.post('/admin/reports', authentication.isAdmin, reportController.updateAdminDisplayReports);
// Export for server.js.
module.exports = router;