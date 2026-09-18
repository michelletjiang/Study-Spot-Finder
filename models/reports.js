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
        default: "pending",
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
module.exports = Report;