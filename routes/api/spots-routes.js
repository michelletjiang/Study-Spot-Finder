const express = require('express');

const studySpotController = require('../../controllers/studyspot-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// any logged-in user (the old routes were admin-only, so students couldn't see details)
router.get('/', auth.apiLoggedIn, studySpotController.listSpots);
router.get('/:id', auth.apiLoggedIn, studySpotController.getSpotJson);

// admin only
router.post('/', auth.apiAdmin, studySpotController.createSpotJson);
router.put('/:id', auth.apiAdmin, studySpotController.updateSpotJson);
router.delete('/:id', auth.apiAdmin, studySpotController.deleteSpotJson);

module.exports = router;
