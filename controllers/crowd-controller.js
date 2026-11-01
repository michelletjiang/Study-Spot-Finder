const mongoose = require('mongoose');
const CrowdReport = require('../models/crowd-report-model');
const StudySpot = require('../models/studyspot-model');
const { LEVELS, getRecentReports, summarise } = require('../services/crowd-service');

const COOLDOWN_MS = 15 * 60 * 1000; // one check-in per user per spot every 15 minutes

// POST /api/crowd/:id  — submit a check-in (logged-in users only)
// Body: { "status": "Quiet" | "Moderate" | "Busy" | "Full" }
exports.apiCheckIn = async (req, res) => {
  try {
    const spotId = req.params.id;
    const userId = req.session.user.id; // from the logged-in user, never from the request body
    const { status } = req.body;

    if (!mongoose.isValidObjectId(spotId)) {
      return res.status(400).json({ message: 'Invalid study spot id' });
    }
    if (!LEVELS.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${LEVELS.join(', ')}` });
    }

    const spot = await StudySpot.findById(spotId);
    if (!spot) {
      return res.status(404).json({ message: 'Study spot not found' });
    }

    // Anti-spam: has this user already reported this spot recently?
    const recent = await CrowdReport.findOne({
      spot: spotId,
      userId,
      createdAt: { $gte: new Date(Date.now() - COOLDOWN_MS) },
    });
    if (recent) {
      const waitMin = Math.ceil((COOLDOWN_MS - (Date.now() - recent.createdAt.getTime())) / 60000);
      return res.status(429).json({ message: `You already checked in here. Try again in ${waitMin} min.` });
    }

    const report = await CrowdReport.create({ spot: spotId, userId, status });

    // Send back the updated summary so the page can refresh straight away.
    const summary = summarise(await getRecentReports(spotId));
    res.status(201).json({ report, summary });
  } catch (err) {
    console.error('Crowd check-in failed:', err);
    res.status(500).json({ message: 'Could not save check-in' });
  }
};

// GET /api/crowd/:id  — current crowd level + recent check-ins
exports.apiGetCrowd = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid study spot id' });
    }

    const reports = await getRecentReports(req.params.id);
    res.json({
      summary: summarise(reports),
      // Last 10 check-ins, without user ids so we don't expose who reported what.
      recent: reports.slice(0, 10).map(r => ({ status: r.status, createdAt: r.createdAt })),
    });
  } catch (err) {
    console.error('Fetching crowd reports failed:', err);
    res.status(500).json({ message: 'Could not load crowd status' });
  }
};
