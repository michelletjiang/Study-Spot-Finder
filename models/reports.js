const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
        required: true    
    },
    reportedBy: {
        type: String,
        ref: "User",
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "Pending",
        enum: ["Pending","Approved","Declined"]
    },
    reason: {
      type: String,
      enum: ["Inaccurate", "Offensive", "Spam", "Other"],
      required: true
}},
{
    timestamps: true
  });

const Report = mongoose.model('Report', reportSchema,'reports');

//Methods here

Report.addReport = function(newReport) {
  return Report.create(newReport)
};

Report.editReport = function(_id, description,reason) {
  return Report.updateOne(
    { _id: _id },
      {
        reason: reason,
        description: description
      }
  );
};
// used when a review is deleted
Report.deleteByReview = function(reviewId) {
  return Report.deleteMany({ reviewId: reviewId });
};

Report.deleteByReviews = function(reviewIds) {
  return Report.deleteMany({ reviewId: { $in: reviewIds } });
};

module.exports = Report;