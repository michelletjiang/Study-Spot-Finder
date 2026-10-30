// ACTIVE (comparison feature): helper that checks the ids in a compare request. Used by controllers/studyspot-controller.js.
// mongoose is only used here to test whether a string looks like a MongoDB ObjectId.
const mongoose = require('mongoose');

// Turns the raw "ids" query value ("a,b,c") into a clean list and says whether it is allowed.
function parseComparisonIds(value) {
  // Split at commas, trim spaces and drop empty parts, so "a, ,b" becomes two ids.
  const rawIds = String(value || '').split(',').map(id => id.trim()).filter(Boolean);
  // Normalise valid ids to lower-case hex so the same spot written two ways counts as one. Invalid ones are kept as-is for the check below.
  const ids = rawIds.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id).toHexString() : id);
  // Valid means: 2 or 3 ids, no duplicates, and every id is a real ObjectId. This is the server-side limit that matches the client's three-spot cap.
  const valid = ids.length >= 2 && ids.length <= 3 && new Set(ids).size === ids.length && rawIds.every(id => mongoose.isValidObjectId(id));
  // Returns both the ids and the verdict; the controller answers 400 when valid is false.
  return { ids, valid };
}

// Export so the controller can import it. Tested by test/compare.test.js.
module.exports = { parseComparisonIds };
