// ACTIVE: JSON routes for admin requests, mounted at /api/admin-requests by routes/api/index.js.
// Router lets us group these paths under one prefix.
const express = require('express');

// The controller functions with the api prefix return JSON for the Vue client.
const adminRequestController = require('../../controllers/admin-request-controller');
// auth.apiLoggedIn and auth.apiAdmin answer 401 or 403 JSON instead of redirecting.
const auth = require('../../middleware/auth-middleware');
// This router starts with no routes; each line below adds one.
const router = express.Router();

// User submits a request to become admin
// POST /api/admin-requests: a logged-in student asks to become an admin.
router.post('/', auth.apiLoggedIn, adminRequestController.apiRequestAdmin);

// Admin lists, approves or denies requests
// GET /api/admin-requests: admins list the pending requests.
router.get('/', auth.apiAdmin, adminRequestController.apiListPendingRequests);
// POST /api/admin-requests/:id/approve: admin approves one request (:id is the request id).
router.post('/:id/approve', auth.apiAdmin, adminRequestController.apiApproveRequest);
// POST /api/admin-requests/:id/deny: admin denies one request.
router.post('/:id/deny', auth.apiAdmin, adminRequestController.apiDenyRequest);

// Export so routes/api/index.js can mount it.
module.exports = router;
