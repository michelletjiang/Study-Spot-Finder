const express = require('express');

const buildingsController = require('../../controllers/building-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// any logged-in user
router.get('/', auth.apiLoggedIn, buildingsController.listBuildings);
router.get('/:buildingname/spots', auth.apiLoggedIn, buildingsController.listBuildingSpots);
router.get('/:postal', auth.apiLoggedIn, buildingsController.getBuildingJson);

// admin only
router.post('/', auth.apiAdmin, buildingsController.createBuildingJson);
router.put('/:postal', auth.apiAdmin, buildingsController.updateBuildingJson);
router.delete('/:postal', auth.apiAdmin, buildingsController.deleteBuildingJson);

module.exports = router;
