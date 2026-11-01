// LEGACY - not used by the Vue demo: old admin-only EJS study-spot routes. Replaced by routes/api/spots-routes.js.
const express = require('express');

// Legacy spot controller.
const studySpotController = require('../controllers/studyspot-controller');
// Legacy guards.
const authentication = require('../middleware/auth-middleware');
// A fresh router for this file only.
const router = express.Router();


// Existing note below: the replacement routes/api/spots-routes.js now exists, so the TODO(M2) is done. Only the file deletion at the M6 cut-over remains.
// TODO(M2): these are all admin-only EJS routes. Add a new routes/api/spots.js with REST routes:
//   GET    /api/spots, GET /api/spots/:id      -> apiLoggedIn (students need these)
//   POST   /api/spots, PUT /api/spots/:id, DELETE /api/spots/:id -> apiAdmin
// Delete this file at the M6 cut-over.

// Define GET route to show all spots in one building
// List spots in one building (admin only here, so students could not use it).
router.get("/studyspot-list",authentication.isAdmin, studySpotController.showStudySpots);

// Define GET route to show one study spot detail page
// One spot detail page.
router.get("/studyspot-details",authentication.isAdmin, studySpotController.showSpotDetail);

// Define GET/POST route to display add form and submit form
// Add-spot form and submit.
router.get("/add-studyspot",authentication.isAdmin, studySpotController.showAddForm);
router.post("/add-studyspot",authentication.isAdmin, studySpotController.createSpot);

// Define GET/POST route to display edit form and update result
// Edit form and submit.
router.get("/edit-studyspot",authentication.isAdmin, studySpotController.showEditForm);
router.post("/edit-studyspot",authentication.isAdmin, studySpotController.updateSpot);

// Define GET/POST route to mark spot for deletion and confirm delete
// Delete confirm and submit.
router.get("/delete-studyspot",authentication.isAdmin, studySpotController.showDeleteForm);
router.post("/delete-studyspot",authentication.isAdmin, studySpotController.deleteSpot);


// EXPORT
// Export for server.js.
module.exports = router;