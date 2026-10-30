// ACTIVE: walking directions route, mounted at /api/directions. Feeds the MiniMap on the building page.
const express = require('express');

// Controller calls services/onemap.js, which talks to the OneMap provider.
const directionsController = require('../../controllers/directions-controller');
// Only logged-in users can call it because each call uses the team's OneMap quota.
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// any logged-in user (each call uses our OneMap quota, so not public)
// GET /api/directions with coordinates in the query string.
router.get('/', auth.apiLoggedIn, directionsController.getDirections);

// Export for routes/api/index.js.
module.exports = router;
