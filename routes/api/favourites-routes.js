const express = require('express');

const favouritesController = require('../../controllers/favourites-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

router.get('/', auth.apiLoggedIn, favouritesController.apiListFavourites);
router.post('/', auth.apiLoggedIn, favouritesController.apiAddFavourite);
router.delete('/:id', auth.apiLoggedIn, favouritesController.apiRemoveFavourite);

module.exports = router;
