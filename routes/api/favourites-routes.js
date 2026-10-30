// ACTIVE: favourites JSON routes, mounted at /api/favourites. Used by client/src/stores/favourites.js.
const express = require('express');

// Controller with apiListFavourites, apiAddFavourite and apiRemoveFavourite.
const favouritesController = require('../../controllers/favourites-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// GET lists the current user's favourite spots.
router.get('/', auth.apiLoggedIn, favouritesController.apiListFavourites);
// POST adds a spot to the favourites.
router.post('/', auth.apiLoggedIn, favouritesController.apiAddFavourite);
// DELETE removes the favourite with that id.
router.delete('/:id', auth.apiLoggedIn, favouritesController.apiRemoveFavourite);

// Export for routes/api/index.js.
module.exports = router;
