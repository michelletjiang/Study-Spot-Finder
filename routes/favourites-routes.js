// LEGACY - not used by the Vue demo: old EJS favourites routes. Replaced by routes/api/favourites-routes.js.
const express = require('express');
// A fresh router for this file only.
const router = express.Router();
// Legacy favourites controller renders EJS views and redirects.
const favouritesController = require('../controllers/favourites-controller');
// Legacy guards redirect to the login page.
const authentication = require('../middleware/auth-middleware');

// READ MANY - show favourites page
// Show the favourites page.
router.get('/favourites', authentication.isLoggedIn, favouritesController.showFavourites);

// CREATE - add to favourites via link
// Add a favourite when a link is opened (a GET that changes data, which is one reason it was replaced).
router.get('/favourites/add', authentication.isLoggedIn, favouritesController.addFavourite);

// DELETE - remove from favourites via link
// Remove a favourite the same way.
router.get('/favourites/remove', authentication.isLoggedIn, favouritesController.removeFavourite);

// Export for server.js.
module.exports = router;