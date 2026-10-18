const express = require('express');

const reviewsController = require('./../controllers/reviews-controller')
const authentication = require('../middleware/auth-middleware');
const Review = require('../models/reviews-model');
const router=express.Router();

// a review belongs to the user whose username is in userId
const ownsReview = (getId) => authentication.owns(getId, Review.findByreviewId, r => r.userId);

router.get('/review-list/:building/:spotName', authentication.isLoggedIn, reviewsController.showReview) // to display all reviews

router.get('/add-review/:building/:spotName', authentication.isLoggedIn,reviewsController.showAddReview) // to show form to add review
router.post('/add-review/:building/:spotName', authentication.isLoggedIn, reviewsController.createReview) // submit form to add review

router.get('/reviews/:userId', authentication.isLoggedIn, reviewsController.showUserReviews)
router.get('/update-review/:reviewId', authentication.isLoggedIn, ownsReview(req => req.params.reviewId), reviewsController.getReview)
router.post('/update-review/:reviewId', authentication.isLoggedIn, ownsReview(req => req.body.reviewId), reviewsController.updateReview)

router.get("/delete-review", authentication.isLoggedIn, ownsReview(req => req.query.id), reviewsController.getMarkedReview);
router.post("/delete-review", authentication.isLoggedIn, ownsReview(req => req.body.id), reviewsController.deleteAReview);

module.exports = router;



