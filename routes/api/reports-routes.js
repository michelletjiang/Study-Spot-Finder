const express = require('express');

const reportController = require('../../controllers/report-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// any logged-in user
router.post('/', auth.apiLoggedIn, reportController.apiCreateReport);
router.get('/pending', auth.apiAdmin, reportController.apiPendingReports); // before /:id
router.get('/:id', auth.apiLoggedIn, reportController.apiGetReport);
router.put('/:id', auth.apiLoggedIn, reportController.apiUpdateReport);

// admin only
router.post('/:id/approve', auth.apiAdmin, reportController.apiApproveReport);
router.post('/:id/decline', auth.apiAdmin, reportController.apiDeclineReport);

module.exports = router;
