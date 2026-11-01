const mongoose = require('mongoose')

const studySpotAlertSchema = new mongoose.Schema({
  spot:        { type: mongoose.Schema.Types.ObjectId, ref: 'StudySpot', required: true, index: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['Closed', 'Aircon', 'WiFi', 'Event', 'Other'], required: true },
  description: { type: String, maxlength: 300 },
  confirms:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  disputes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt:   { type: Date, required: true },
  resolved:    { type: Boolean, default: false },
}, { timestamps: true });

const StudySpotAlert = mongoose.model('StudySpotAlert', studySpotAlertSchema, 'studyspotalerts');

module.exports = StudySpotAlert;
