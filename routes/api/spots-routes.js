// ACTIVE: study-spot JSON routes, mounted at /api/spots. The comparison feature's server entry point is here.
const express = require('express');

// Controller with listSpots, compareSpots and the other spot handlers.
const studySpotController = require('../../controllers/studyspot-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// Routes any logged-in user can read.
// any logged-in user (the old routes were admin-only, so students couldn't see details)
// GET /api/spots: list spots.
router.get('/', auth.apiLoggedIn, studySpotController.listSpots);
// GET /api/spots/compare?ids=a,b: the read-only comparison. It sits before /:id so "compare" is not read as a spot id. apiLoggedIn gives 401 when logged out.
router.get('/compare', auth.apiLoggedIn, studySpotController.compareSpots);
// GET /api/spots/:id: details of one spot.
router.get('/:id', auth.apiLoggedIn, studySpotController.getSpotJson);

// Routes only an admin can use.
// admin only
// POST creates a spot.
router.post('/', auth.apiAdmin, studySpotController.createSpotJson);
// PUT updates a spot.
router.put('/:id', auth.apiAdmin, studySpotController.updateSpotJson);
// DELETE removes a spot.
router.delete('/:id', auth.apiAdmin, studySpotController.deleteSpotJson);

// Export for routes/api/index.js.
module.exports = router;
