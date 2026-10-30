// LEGACY - not used by the Vue demo: old EJS account pages. Replaced by routes/api/auth-routes.js and profile-routes.js.
const express = require('express');
// A fresh router for this file only.
const router = express.Router();
// Legacy user controller (registerGet, loginPost and so on).
const userController = require('../controllers/user-controller');
// Legacy guards.
const authMiddleware = require('../middleware/auth-middleware');

// Old redirect from /index.html to the home page.
router.get('/index.html', (req, res) => {
    res.redirect('/')
});

// Show the register form and submit it.
router.get('/register', userController.registerGet);
router.post('/register', userController.registerPost);

// Show the login form and submit it.
router.get('/login', userController.loginGet);
router.post('/login', userController.loginPost);


// Profile page for a logged-in user.
router.get('/profile', authMiddleware.isLoggedIn, userController.profile);

// Profile page for an admin.
router.get('/admin-profile', authMiddleware.isAdmin, userController.adminProfile)

// Edit-profile form and submit.
router.get('/edit-profile', authMiddleware.isLoggedIn, userController.editProfileGet);
router.post('/edit-profile', authMiddleware.isLoggedIn, userController.editProfilePost);


// Page that goes to the user's reviews.
router.get('/reviews', authMiddleware.isLoggedIn, userController.goToReviews);

// Log out through a GET link.
router.get('/logout', userController.logout);

// Delete the account.
router.post('/delete', userController.deleteUser);

// Export for server.js.
module.exports = router;