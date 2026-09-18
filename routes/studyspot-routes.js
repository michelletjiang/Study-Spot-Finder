const express = require('express');

const studySpotController = require('../controllers/studyspot-controller');
const authentication = require('../middleware/auth-middleware');
const router = express.Router();


// Define GET route to show all spots in one building
router.get("/studyspot-list",authentication.isAdmin, studySpotController.showStudySpots);

// Define GET route to show one study spot detail page
router.get("/studyspot-details",authentication.isAdmin, studySpotController.showSpotDetail);

// Define GET/POST route to display add form and submit form
router.get("/add-studyspot",authentication.isAdmin, studySpotController.showAddForm);
router.post("/add-studyspot",authentication.isAdmin, studySpotController.createSpot);

// Define GET/POST route to display edit form and update result
router.get("/edit-studyspot",authentication.isAdmin, studySpotController.showEditForm);
router.post("/edit-studyspot",authentication.isAdmin, studySpotController.updateSpot);

// Define GET/POST route to mark spot for deletion and confirm delete
router.get("/delete-studyspot",authentication.isAdmin, studySpotController.showDeleteForm);
router.post("/delete-studyspot",authentication.isAdmin, studySpotController.deleteSpot);


// EXPORT
module.exports = router;