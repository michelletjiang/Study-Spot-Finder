// ACTIVE: profile JSON routes, mounted at /api/profile.
const express = require('express');

// Controller with the apiGetProfile, apiUpdateProfile and apiDeleteAccount handlers.
const userController = require('../../controllers/user-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// GET returns the logged-in user's profile.
router.get('/', auth.apiLoggedIn, userController.apiGetProfile);
// PUT updates the profile fields.
router.put('/', auth.apiLoggedIn, userController.apiUpdateProfile);
// GET and PUT the study preferences used to rank spots.
router.get('/preferences', auth.apiLoggedIn, userController.apiGetPreferences);
router.put('/preferences', auth.apiLoggedIn, userController.apiUpdatePreferences);
// DELETE removes the account.
router.delete('/', auth.apiLoggedIn, userController.apiDeleteAccount);

// Export for routes/api/index.js.
module.exports = router;
