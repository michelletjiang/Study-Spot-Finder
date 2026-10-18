const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const authMiddleware = require('../middleware/auth-middleware');

router.get('/index.html', (req, res) => {
    res.redirect('/')
});

router.get('/register', userController.registerGet);
router.post('/register', userController.registerPost);

router.get('/login', userController.loginGet);
router.post('/login', userController.loginPost);


router.get('/profile', authMiddleware.isLoggedIn, userController.profile);

router.get('/admin-profile', authMiddleware.isAdmin, userController.adminProfile)

router.get('/edit-profile', authMiddleware.isLoggedIn, userController.editProfileGet);
router.post('/edit-profile', authMiddleware.isLoggedIn, userController.editProfilePost);


router.get('/reviews', authMiddleware.isLoggedIn, userController.goToReviews);

router.get('/logout', userController.logout);

router.post('/delete', authMiddleware.isLoggedIn, userController.deleteUser);

module.exports = router;