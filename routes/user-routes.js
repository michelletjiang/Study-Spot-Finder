const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const authMiddleware = require('../middleware/auth-middleware');

router.get('/index.html', (req, res) => {
    res.redirect('/')
});

// GET renders the form; POST validates and creates the account with a server-assigned Student role.
router.get('/register', userController.registerGet);
router.post('/register', userController.registerPost);

router.get('/login', userController.loginGet);
router.post('/login', userController.loginPost);


// Middleware runs before the controller, so direct navigation is protected even when a link is hidden.
router.get('/profile', authMiddleware.isLoggedIn, userController.profile);

router.get('/admin-profile', authMiddleware.isAdmin, userController.adminProfile)

router.get('/edit-profile', authMiddleware.isLoggedIn, userController.editProfileGet);
router.post('/edit-profile', authMiddleware.isLoggedIn, userController.editProfilePost);


router.get('/reviews', authMiddleware.isLoggedIn, userController.goToReviews);

// Logout is a state-changing POST and therefore also receives the global CSRF check.
router.post('/logout', authMiddleware.isLoggedIn, userController.logout);

router.post('/delete', authMiddleware.isLoggedIn, userController.deleteUser);

module.exports = router;