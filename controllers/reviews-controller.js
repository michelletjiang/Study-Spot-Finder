// JSON API for reviews, used by routes/api/reviews-routes.js.
// Review model: the reviews collection.
const Review = require('../models/reviews-model'); // path to model
// Used to check that ids are well formed before querying.
const mongoose = require('mongoose');
const cascade = require('../services/cascade-service'); // deletes child records with their parent
// Shared checks: input validation, votes, and who may edit or delete a review.
const { validateReview, validateVote, withVotes, sortByScore, canEditReview, canDeleteReview } = require('../lib/reviews');

// ACTIVE: JSON API used by the Vue client (SpotDetailView.vue, ReviewFormView.vue, MyReviewsView.vue).
// ---------- JSON API (used by Vue) ----------
// Reviews are stored by buildingName + roomId (spot name) + userId (username), same as the old pages,
// so reviews written on the EJS pages still show up here.

// Spot model, to find the spot a review belongs to.
const StudySpot = require('../models/studyspot-model');

// validateReview, the vote helpers and the permission checks are imported at the top from lib/reviews.js,
// so they can be unit tested (test/unit/reviews.spec.js).

// finds a review by :id, or sends 404 and returns null
// Helper: load a review by :id, or send a 404 and return null.
async function findReviewOr404(req, res) {
    const review = mongoose.isValidObjectId(req.params.id) ? await Review.findByreviewId(req.params.id) : null;
    if (!review) res.status(404).json({ message: 'Review not found' });
    return review;
}

// GET /api/reviews?spotId=: the reviews of one spot, newest first.
// GET /api/reviews?spotId=   (all reviews for one study spot, newest first)
exports.apiListReviews = async (req, res) => {
    // spotId is required and must be well formed.
    if (!mongoose.isValidObjectId(req.query.spotId)) return res.status(400).json({ message: 'spotId is required' });
    try {
        // Find the spot first, to get its building and name.
        const spot = await StudySpot.findById(req.query.spotId);
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });
        // Reviews are matched by building name and spot name. sort puts the newest first.
        const reviews = await Review.findByRoom(spot.buildingName, spot.name);
        // Add vote counts and the viewer's own vote, then show the most helpful first.
        res.json(sortByScore(reviews.map(r => withVotes(r, req.session.user.username))));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/reviews/mine: the logged-in user's reviews.
// GET /api/reviews/mine
exports.apiMyReviews = async (req, res) => {
    try {
        const reviews = await Review.findbyUser(req.session.user.username).sort({ createdAt: -1 });
        res.json(reviews.map(r => withVotes(r, req.session.user.username)));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/reviews/:id: one review.
// GET /api/reviews/:id
exports.apiGetReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (review) res.json(withVotes(review, req.session.user.username));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving review' });
    }
};

// POST /api/reviews: create a review for a spot.
// POST /api/reviews   body: { spotId, title, content, rating }
exports.apiCreateReview = async (req, res) => {
    const msg = validateReview(req.body);
    if (msg) return res.status(400).json({ message: msg });
    if (!mongoose.isValidObjectId(req.body.spotId)) return res.status(404).json({ message: 'Study spot not found' });
    try {
        const spot = await StudySpot.findById(req.body.spotId);
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });

        // Save the review under the spot's building and name and the user's name.
        const review = await Review.addReview({
            buildingName: spot.buildingName,
            userId:       req.session.user.username,
            roomId:       spot.name,
            title:        req.body.title.trim(),
            content:      req.body.content.trim(),
            rating:       Number(req.body.rating),
            noiseLevel:   req.body.noiseLevel
        });
        // 201 means created.
        res.status(201).json(withVotes(review, req.session.user.username));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding review' });
    }
};

// PUT /api/reviews/:id: only the author may edit.
// PUT /api/reviews/:id   (only the author - the old page let anyone edit any review)
exports.apiUpdateReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (!review) return;
        // Anyone else gets 403.
        if (!canEditReview(review, req.session.user)) return res.status(403).json({ message: 'You can only edit your own reviews' });
        const msg = validateReview(req.body);
        if (msg) return res.status(400).json({ message: msg });

        // Write the new values.
        await Review.editReview(review._id, req.body.title.trim(), req.body.content.trim(), Number(req.body.rating), req.body.noiseLevel);
        res.json(withVotes(await Review.findByreviewId(review._id), req.session.user.username));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating review' });
    }
};

// DELETE /api/reviews/:id: the author or an admin.
// DELETE /api/reviews/:id   (the author, or an admin)
exports.apiDeleteReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (!review) return;
        // Others get 403.
        if (!canDeleteReview(review, req.session.user))
            return res.status(403).json({ message: 'You can only delete your own reviews' });

        // Delete the review and every report filed against it.
        await cascade.deleteReview(review._id);
        // 204 means success with no body.
        res.status(204).end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete review' });
    }
};

// POST /api/reviews/:id/vote  body: { vote: 'up' | 'down' | 'none' }
// One vote per user per review; voting the other way switches it, 'none' removes it.
exports.apiVoteReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (!review) return;
        const username = req.session.user.username;
        const msg = validateVote(review, username, req.body.vote);
        if (msg) return res.status(msg.startsWith('You cannot') ? 403 : 400).json({ message: msg });
        const updated = await Review.voteReview(review._id, username, req.body.vote);
        res.json(withVotes(updated, username));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving vote' });
    }
};
