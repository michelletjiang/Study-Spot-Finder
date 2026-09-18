const express = require('express');

const reviewsController = require('./../controllers/reviews-controller')
const authentication = require('../middleware/auth-middleware');
const router=express.Router();

router.get('/review-list/:building/:spotName', authentication.isLoggedIn, reviewsController.showReview) // to display all reviews

router.get('/add-review/:building/:spotName', authentication.isLoggedIn,reviewsController.showAddReview) // to show form to add review
router.post('/add-review/:building/:spotName', authentication.isLoggedIn, reviewsController.createReview) // submit form to add review

router.get('/reviews/:userId', authentication.isLoggedIn, reviewsController.showUserReviews)
router.get('/update-review/:reviewId', authentication.isLoggedIn, reviewsController.getReview)
router.post('/update-review/:reviewId', authentication.isLoggedIn, reviewsController.updateReview)

router.get("/delete-review", authentication.isLoggedIn, reviewsController.getMarkedReview);
router.post("/delete-review", authentication.isLoggedIn, reviewsController.deleteAReview);

module.exports = router;



