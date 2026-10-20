const express = require('express');

const adminRequestController = require('../../controllers/admin-request-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// User submits a request to become admin
router.post('/', auth.apiLoggedIn, adminRequestController.apiRequestAdmin);

// Admin lists, approves or denies requests
router.get('/', auth.apiAdmin, adminRequestController.apiListPendingRequests);
router.post('/:id/approve', auth.apiAdmin, adminRequestController.apiApproveRequest);
router.post('/:id/deny', auth.apiAdmin, adminRequestController.apiDenyRequest);

module.exports = router;
