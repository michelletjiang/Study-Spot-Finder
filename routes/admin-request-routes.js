// LEGACY - not used by the Vue demo: old EJS-era admin-request routes, mounted by server.js at the root. The Vue app uses routes/api/admin-requests-routes.js instead.
// Express gives us the Router, a small sub-app that server.js mounts.
const express = require('express');
// The controller holds the handler functions these routes call.
const adminRequestController = require('../controllers/admin-request-controller');
// Middleware that redirects to the legacy login page when the user is not allowed (isLoggedIn, isAdmin).
const authentication = require('../middleware/auth-middleware');
// A fresh router for this file only.
const router = express.Router();

// User submits a request to become admin
// Any logged-in user can ask to become an admin; the handler stores the request.
router.post('/admin-request', authentication.isLoggedIn, adminRequestController.requestAdmin);

// Admin approves or denies a request
// Only an admin can approve or deny; the handler updates the request and the user.
router.post('/admin/requests/process', authentication.isAdmin, adminRequestController.processRequest);

// Hand the router back to server.js.
module.exports = router;
