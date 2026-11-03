const mongoose = require('mongoose')

// One student sitting in one study spot. createdAt is when they checked in.
// endsAt is when the check-in stops counting: 3 hours later, or earlier if they check out
// (checking out just moves endsAt to "now"). So "who's here?" = check-ins whose endsAt is still in the future.
const checkInSchema = new mongoose.Schema({
  spot:   { type: mongoose.Schema.Types.ObjectId, ref: 'StudySpot', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  endsAt: { type: Date, required: true },
}, { timestamps: true });

checkInSchema.index({ spot: 1, endsAt: 1 }); // "how many people are in these spots right now?"

const CheckIn = mongoose.model('CheckIn', checkInSchema, 'checkins');

module.exports = CheckIn;
