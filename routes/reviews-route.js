// LEGACY - not used by the Vue demo: old EJS review routes. Replaced by routes/api/reviews-routes.js.
const express = require('express');

// Legacy review controller.
const reviewsController = require('./../controllers/reviews-controller')
// Legacy guards.
const authentication = require('../middleware/auth-middleware');
// A fresh router for this file only.
const router=express.Router();

// Show all reviews for a spot.
router.get('/review-list/:building/:spotName', authentication.isLoggedIn, reviewsController.showReview) // to display all reviews

// Show and submit the add-review form.
router.get('/add-review/:building/:spotName', authentication.isLoggedIn,reviewsController.showAddReview) // to show form to add review
router.post('/add-review/:building/:spotName', authentication.isLoggedIn, reviewsController.createReview) // submit form to add review

// List one user's reviews.
router.get('/reviews/:userId', authentication.isLoggedIn, reviewsController.showUserReviews)
// Show and submit the update form.
router.get('/update-review/:reviewId', authentication.isLoggedIn, reviewsController.getReview)
router.post('/update-review/:reviewId', authentication.isLoggedIn, reviewsController.updateReview)

// Confirm and then delete a review.
router.get("/delete-review", authentication.isLoggedIn, reviewsController.getMarkedReview);
router.post("/delete-review", authentication.isLoggedIn, reviewsController.deleteAReview);

// Export for server.js.
module.exports = router;



