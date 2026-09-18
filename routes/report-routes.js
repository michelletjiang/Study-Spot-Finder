const express = require('express');

const reportController = require('../controllers/report-controller');
const authentication = require('../middleware/auth-middleware');
const router = express.Router();

router.get('/reports/new/:reviewId',authentication.isLoggedIn, reportController.findReviewforReport);
router.post('/reports/new/:reviewId',authentication.isLoggedIn, reportController.uploadReport);

router.get('/reports/edit/:reportId',authentication.isLoggedIn, reportController.editReport);
router.post('/reports/edit/:reportId',authentication.isLoggedIn, reportController.updateReport);

router.get('/admin/reports', authentication.isAdmin, reportController.adminDisplayReports);
router.post('/admin/reports', authentication.isAdmin, reportController.updateAdminDisplayReports);
module.exports = router;