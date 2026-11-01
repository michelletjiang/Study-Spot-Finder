// ACTIVE: input checks for reviews. Used by controllers/reviews-controller.js. Tested by test/unit/reviews.spec.js.

// Same three levels a study spot uses, so the study spot finder can average them (models/reviews-model.js summariseAll).
const NOISE_LEVELS = ['Quiet', 'Moderate', 'Loud'];

// Returns an error message for a bad review, or null when it is fine.
// noiseLevel is how loud the reviewer found the spot when they were there.
function validateReview({ title, content, rating, noiseLevel }) {
    if (!String(title || '').trim() || !String(content || '').trim() || rating === undefined || rating === '' || !noiseLevel)
        return 'All fields are required.';
    if (!(Number(rating) >= 1 && Number(rating) <= 5)) return 'Rating must be between 1 and 5.';
    if (!NOISE_LEVELS.includes(noiseLevel)) return 'Noise level must be Quiet, Moderate or Loud.';
    return null;
}

module.exports = { NOISE_LEVELS, validateReview };
