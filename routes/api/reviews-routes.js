const express = require('express');

const reviewsController = require('../../controllers/reviews-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

router.get('/', auth.apiLoggedIn, reviewsController.apiListReviews);     // ?spotId=
router.get('/mine', auth.apiLoggedIn, reviewsController.apiMyReviews);   // before /:id, or "mine" is treated as an id
router.get('/:id', auth.apiLoggedIn, reviewsController.apiGetReview);
router.post('/', auth.apiLoggedIn, reviewsController.apiCreateReview);
router.put('/:id', auth.apiLoggedIn, reviewsController.apiUpdateReview);
router.delete('/:id', auth.apiLoggedIn, reviewsController.apiDeleteReview);

module.exports = router;
