// ACTIVE: review JSON routes, mounted at /api/reviews.
const express = require('express');

// Controller with the apiXxx handlers for reviews.
const reviewsController = require('../../controllers/reviews-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

// GET lists the reviews of one spot (spotId is a query parameter).
router.get('/', auth.apiLoggedIn, reviewsController.apiListReviews);     // ?spotId=
// GET /mine lists the logged-in user's reviews. It is declared before /:id so "mine" is not read as an id.
router.get('/mine', auth.apiLoggedIn, reviewsController.apiMyReviews);   // before /:id, or "mine" is treated as an id
// GET /:id reads one review.
router.get('/:id', auth.apiLoggedIn, reviewsController.apiGetReview);
// POST creates a review.
router.post('/', auth.apiLoggedIn, reviewsController.apiCreateReview);
// PUT /:id edits a review.
router.put('/:id', auth.apiLoggedIn, reviewsController.apiUpdateReview);
// DELETE /:id removes a review.
router.delete('/:id', auth.apiLoggedIn, reviewsController.apiDeleteReview);
router.post('/:id/vote', auth.apiLoggedIn, reviewsController.apiVoteReview);   // body: { vote: 'up' | 'down' | 'none' }

// Export for routes/api/index.js.
module.exports = router;
