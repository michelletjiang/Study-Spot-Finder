// ACTIVE: building JSON routes, mounted at /api/buildings.
const express = require('express');

// Controller with the JSON handlers (listBuildings, listBuildingSpots and so on).
const buildingsController = require('../../controllers/building-controller');
// Guards: apiLoggedIn for students, apiAdmin for management.
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// Routes any logged-in student can read.
// any logged-in user
// GET /api/buildings: list buildings for the home page.
router.get('/', auth.apiLoggedIn, buildingsController.listBuildings);
// GET /api/buildings/:buildingname/spots: spots in one building. The Compare buttons live on this page (BuildingSpotsView.vue).
router.get('/:buildingname/spots', auth.apiLoggedIn, buildingsController.listBuildingSpots);
// GET /api/buildings/:postal: one building by postal code. Declared after the /spots route so a longer path is matched first.
router.get('/:postal', auth.apiLoggedIn, buildingsController.getBuildingJson);

// Routes only an admin can use.
// admin only
// POST creates a building.
router.post('/', auth.apiAdmin, buildingsController.createBuildingJson);
// PUT updates the building with that postal code.
router.put('/:postal', auth.apiAdmin, buildingsController.updateBuildingJson);
// DELETE removes it.
router.delete('/:postal', auth.apiAdmin, buildingsController.deleteBuildingJson);

// Export for routes/api/index.js.
module.exports = router;
