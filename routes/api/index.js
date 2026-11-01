// ACTIVE: the single entry point for every JSON route. server.js mounts this file at /api.
// Express provides the Router.
const express = require('express');

// One router that collects all the feature routers below.
const router = express.Router();

// JSON API used by the Vue client. One router file per feature in this folder.
// Each use() line attaches one feature router under a URL prefix. Auth routes sit at the root.
router.use('/', require('./auth-routes'));   // → /api/register, /api/login, /api/logout
// /api/profile: view, update or delete the logged-in account.
router.use('/profile', require('./profile-routes'));
// /api/admin-requests: ask to become an admin and moderation of those requests.
router.use('/admin-requests', require('./admin-requests-routes'));
// /api/buildings: building list and building details.
router.use('/buildings', require('./buildings-routes'));
// /api/spots: spot list, detail and the comparison read (GET /api/spots/compare).
router.use('/spots', require('./spots-routes'));
// /api/reviews: reviews for a spot and the user's own reviews.
router.use('/reviews', require('./reviews-routes'));
// /api/reports: students report reviews and admins moderate the reports.
router.use('/reports', require('./reports-routes'));
// /api/favourites: the saved-spots list.
router.use('/favourites', require('./favourites-routes'));
// /api/directions: OneMap walking directions for the minimap.
router.use('/directions', require('./directions-routes'));
router.use('/nearby', require('./nearby-routes'));
router.use('/crowd', require('./crowd-routes'));   
router.use('/alerts', require('./alerts-routes'));   



// Any /api path that no router handled gets a JSON 404 instead of falling through to the EJS routes
// Catch-all: this runs only when no router above answered. It returns a JSON 404, so the Vue client never receives an HTML error page.
router.use((req, res) => {
    // The message names the method and URL to make debugging easy.
    res.status(404).json({ message: `No API route for ${req.method} ${req.originalUrl}` });
});

// Export for server.js.
module.exports = router;
