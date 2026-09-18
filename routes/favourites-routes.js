const express = require('express');
const router = express.Router();
const favouritesController = require('../controllers/favourites-controller');
const authentication = require('../middleware/auth-middleware');

// READ MANY - show favourites page
router.get('/favourites', authentication.isLoggedIn, favouritesController.showFavourites);

// CREATE - add to favourites via link
router.get('/favourites/add', authentication.isLoggedIn, favouritesController.addFavourite);

// DELETE - remove from favourites via link
router.get('/favourites/remove', authentication.isLoggedIn, favouritesController.removeFavourite);

module.exports = router;