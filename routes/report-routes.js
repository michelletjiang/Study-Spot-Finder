const express = require('express');

const reportController = require('../controllers/report-controller');
const authentication = require('../middleware/auth-middleware');
const Report = require('../models/reports');
const router = express.Router();

const ownsReport = authentication.owns(req => req.params.reportId, id => Report.findById(id), r => r.reportedBy);

router.get('/reports/new/:reviewId',authentication.isLoggedIn, reportController.findReviewforReport);
router.post('/reports/new/:reviewId',authentication.isLoggedIn, reportController.uploadReport);

router.get('/reports/edit/:reportId',authentication.isLoggedIn, ownsReport, reportController.editReport);
router.post('/reports/edit/:reportId',authentication.isLoggedIn, ownsReport, reportController.updateReport);

router.get('/admin/reports', authentication.isAdmin, reportController.adminDisplayReports);
router.post('/admin/reports', authentication.isAdmin, reportController.updateAdminDisplayReports);
module.exports = router;