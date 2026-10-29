const express = require('express');

const router = express.Router();

// JSON API used by the Vue client. One router file per feature in this folder.
router.use('/', require('./auth-routes'));   // → /api/register, /api/login, /api/logout
router.use('/profile', require('./profile-routes'));
router.use('/admin-requests', require('./admin-requests-routes'));
router.use('/buildings', require('./buildings-routes'));
router.use('/spots', require('./spots-routes'));
router.use('/reviews', require('./reviews-routes'));
router.use('/reports', require('./reports-routes'));
router.use('/favourites', require('./favourites-routes'));
router.use('/directions', require('./directions-routes'));

// Any /api path that no router handled gets a JSON 404 instead of falling through to the EJS routes
router.use((req, res) => {
    res.status(404).json({ message: `No API route for ${req.method} ${req.originalUrl}` });
});

module.exports = router;
