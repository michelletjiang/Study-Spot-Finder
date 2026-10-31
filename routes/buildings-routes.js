// LEGACY - not used by the Vue demo: old EJS building pages, mounted at the root by server.js. Replaced by routes/api/buildings-routes.js plus Vue views.
const express = require('express');

// The legacy building controller renders EJS views.
const buildingsController = require('../controllers/building-controller');
// Legacy guards redirect to /login instead of returning JSON.
const authentication = require('../middleware/auth-middleware')
// A fresh router for this file only.
const router = express.Router(); // sub application


// Existing defect: this renders an "admin" view that does not exist in views/, so this page would fail if opened. It is left unchanged.
router.get("/admin", authentication.isAdmin, (req, res) => {
  res.render("admin");
});


// Show and submit the add-building form (admin).
router.get("/add-building", authentication.isAdmin, buildingsController.showAddForm);
router.post("/add-building", authentication.isAdmin, buildingsController.createBuilding);

// List buildings so an admin can pick one to edit.
router.get("/edit-buildings", authentication.isAdmin, buildingsController.showBuildingList);

// Show the edit form for one building, then save the edit.
router.get("/update-building", authentication.isAdmin, buildingsController.getBuilding);
router.post("/update-building", authentication.isAdmin, buildingsController.updateBuilding);

// Confirm and then delete a building.
router.get("/delete-building", authentication.isAdmin, buildingsController.getMarkedBuilding);
router.post("/delete-building", authentication.isAdmin, buildingsController.deleteABuilding);

// Old home page: list the buildings for a logged-in user.
router.get("/", authentication.isLoggedIn, buildingsController.showHome);
// Old page that lists the spots in one building.
router.get("/building/:buildingname", authentication.isLoggedIn, buildingsController.showBuildingSpots);

// Export for server.js.
module.exports = router;