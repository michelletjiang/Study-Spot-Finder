// Mongoose supplies the schema and collection model used by crowd reports.
const mongoose = require('mongoose')

// Store one user's crowd observation for a spot, with timestamps for freshness.
const crowdReportSchema = new mongoose.Schema({
  spot:   { type: mongoose.Schema.Types.ObjectId, ref: 'StudySpot', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Quiet', 'Moderate', 'Busy', 'Full'], required: true },
}, { timestamps: true });

// Reuse the named model so controllers can query the crowdreports collection.
const CrowdReport = mongoose.model('CrowdReport', crowdReportSchema, 'crowdreports');

module.exports = CrowdReport;
