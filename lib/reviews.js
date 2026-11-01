// ACTIVE: input checks and vote helpers for reviews. Used by controllers/reviews-controller.js.
// Tested by test/unit/reviews.spec.js.

// Same three levels a study spot uses, so the study spot finder can average them (models/reviews-model.js summariseAll).
const NOISE_LEVELS = ['Quiet', 'Moderate', 'Loud'];

// What a user can do to a review: upvote, downvote, or take their vote back.
const VOTES = ['up', 'down', 'none'];

// Returns an error message for a bad review, or null when it is fine.
// noiseLevel is how loud the reviewer found the spot when they were there.
function validateReview({ title, content, rating, noiseLevel }) {
    if (!String(title || '').trim() || !String(content || '').trim() || rating === undefined || rating === '' || !noiseLevel)
        return 'All fields are required.';
    if (!(Number(rating) >= 1 && Number(rating) <= 5)) return 'Rating must be between 1 and 5.';
    if (!NOISE_LEVELS.includes(noiseLevel)) return 'Noise level must be Quiet, Moderate or Loud.';
    return null;
}

// Returns an error message for a bad vote request, or null when it is allowed.
// Authors cannot vote on their own review.
function validateVote(review, username, vote) {
    if (!VOTES.includes(vote)) return 'Vote must be up, down or none.';
    if (review.userId === username) return 'You cannot vote on your own review.';
    return null;
}

// Turns a review document into what the API sends: the vote counts, the score and the
// current user's own vote, without the lists of who voted (those stay private).
function withVotes(review, username) {
    const plain = typeof review.toObject === 'function' ? review.toObject() : { ...review };
    const upvotes = plain.upvotes || [];
    const downvotes = plain.downvotes || [];
    delete plain.upvotes;
    delete plain.downvotes;
    return {
        ...plain,
        upvoteCount: upvotes.length,
        downvoteCount: downvotes.length,
        score: upvotes.length - downvotes.length,
        myVote: upvotes.includes(username) ? 'up' : downvotes.includes(username) ? 'down' : 'none'
    };
}

// Most helpful first: highest score, then newest. Returns a new array.
function sortByScore(reviews) {
    return [...reviews].sort((a, b) =>
        (b.score - a.score) || (new Date(b.createdAt) - new Date(a.createdAt)));
}

module.exports = { NOISE_LEVELS, VOTES, validateReview, validateVote, withVotes, sortByScore };
