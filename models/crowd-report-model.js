const mongoose = require('mongoose')

const crowdReportSchema = new mongoose.Schema({
  spot:   { type: mongoose.Schema.Types.ObjectId, ref: 'StudySpot', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Quiet', 'Moderate', 'Busy', 'Full'], required: true },
}, { timestamps: true });

const CrowdReport = mongoose.model('CrowdReport', crowdReportSchema, 'crowdreports');

module.exports = CrowdReport;
