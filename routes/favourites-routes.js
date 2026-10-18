const express = require('express');
const router = express.Router();
const favouritesController = require('../controllers/favourites-controller');
const Favourite = require('../models/favourites-model');
const authentication = require('../middleware/auth-middleware');

// READ MANY - show favourites page
router.get('/favourites', authentication.isLoggedIn, favouritesController.showFavourites);

// CREATE - add to favourites
router.post('/favourites/add', authentication.isLoggedIn, favouritesController.addFavourite);

// DELETE - remove from favourites
router.post('/favourites/remove', authentication.isLoggedIn,
    authentication.owns(req => req.body.favId, Favourite.findById, f => f.userName),
    favouritesController.removeFavourite);

module.exports = router;