const express = require('express');

const directionsController = require('../../controllers/directions-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// any logged-in user (each call uses our OneMap quota, so not public)
router.get('/', auth.apiLoggedIn, directionsController.getDirections);

module.exports = router;
