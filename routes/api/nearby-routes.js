const express = require('express');

const nearbyController = require('../../controllers/nearby-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// any logged-in user; POST so the user's location isn't left in URLs and server logs
router.post('/', auth.apiLoggedIn, nearbyController.nearby);

module.exports = router;
