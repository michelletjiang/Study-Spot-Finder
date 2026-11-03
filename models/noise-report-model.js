const mongoose = require('mongoose')

// One checked-in student saying how loud a study spot is right now. createdAt is when they said it.
const noiseReportSchema = new mongoose.Schema({
  spot:   { type: mongoose.Schema.Types.ObjectId, ref: 'StudySpot', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Quiet', 'Moderate', 'Loud'], required: true },
}, { timestamps: true });

const NoiseReport = mongoose.model('NoiseReport', noiseReportSchema, 'noisereports');

module.exports = NoiseReport;
