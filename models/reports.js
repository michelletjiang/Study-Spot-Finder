// ACTIVE: model for reports of reviews. Used by controllers/report-controller.js.
const mongoose = require('mongoose');

// Schema: one report on one review.
const reportSchema = new mongoose.Schema({
    // The review that is being reported.
    reviewId: {
        // ObjectId links to a document in the reviews collection.
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
        required: true    
    },
    // Username of the student who reported it.
    reportedBy: {
        type: String,
        ref: "User",
        required: true,
    },
    // The reporter's explanation.
    description: {
        type: String,
        required: true
    },
    // Moderation state: starts as Pending and an admin moves it to Approved or Declined.
    status: {
        type: String,
        default: "Pending",
        enum: ["Pending","Approved","Declined"]
    },
    // Why it was reported, limited to four reasons.
    reason: {
      type: String,
      enum: ["Inaccurate", "Offensive", "Spam", "Other"],
      required: true
}},
// timestamps adds createdAt and updatedAt.
{
    timestamps: true
  });

// Register the model: name Report, collection "reports".
const Report = mongoose.model('Report', reportSchema,'reports');

// Existing note: the helper methods are attached straight onto the model below.
//Methods here

// Create a report.
Report.addReport = function(newReport) {
  return Report.create(newReport)
};

// Let the reporter edit the description and reason of a report.
Report.editReport = function(_id, description,reason) {
  return Report.updateOne(
    { _id: _id },
      {
        reason: reason,
        description: description
      }
  );
};
// Cascade helpers: remove reports whose review is being deleted.
Report.deleteByReview = function(reviewId) {
  return Report.deleteMany({ reviewId: reviewId });
};
Report.deleteByReviews = function(reviewIds) {
  return Report.deleteMany({ reviewId: { $in: reviewIds } });
};
// Keep a user's reports when they change their username.
Report.renameReporter = function(oldUsername, newUsername) {
  return Report.updateMany({ reportedBy: oldUsername }, { reportedBy: newUsername });
};
// Export the model with its helper methods.
module.exports = Report;