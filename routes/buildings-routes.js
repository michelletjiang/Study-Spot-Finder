const express = require('express');

const buildingsController = require('../controllers/building-controller');
const authentication = require('../middleware/auth-middleware')
const router = express.Router(); // sub application


router.get("/admin", authentication.isAdmin, (req, res) => {
  res.render("admin");
});


router.get("/add-building", authentication.isAdmin, buildingsController.showAddForm);
router.post("/add-building", authentication.isAdmin, buildingsController.createBuilding);

router.get("/edit-buildings", authentication.isAdmin, buildingsController.showBuildingList);

router.get("/update-building", authentication.isAdmin, buildingsController.getBuilding);
router.post("/update-building", authentication.isAdmin, buildingsController.updateBuilding);

router.get("/delete-building", authentication.isAdmin, buildingsController.getMarkedBuilding);
router.post("/delete-building", authentication.isAdmin, buildingsController.deleteABuilding);

router.get("/", authentication.isLoggedIn, buildingsController.showHome);
router.get("/building/:buildingname", authentication.isLoggedIn, buildingsController.showBuildingSpots);

module.exports = router;