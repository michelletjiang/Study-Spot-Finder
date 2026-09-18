const express = require('express');
const adminRequestController = require('../controllers/admin-request-controller');
const authentication = require('../middleware/auth-middleware');
const router = express.Router();

// User submits a request to become admin
router.post('/admin-request', authentication.isLoggedIn, adminRequestController.requestAdmin);

// Admin approves or denies a request
router.post('/admin/requests/process', authentication.isAdmin, adminRequestController.processRequest);

module.exports = router;
