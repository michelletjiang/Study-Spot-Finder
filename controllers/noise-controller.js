// controllers/noise-controller.js
// How loud a study spot is right now. Anyone can read it, but only a student checked in to the spot can report it.

const mongoose = require('mongoose');
const StudySpot = require('../models/studyspot-model');
const { LEVELS, getRecentReports, summarise, getNoiseHeat, addReport } = require('../services/noise-service');
const { getMyCheckIn } = require('../services/checkin-service');

// POST /api/noise/:id  body: { status }  — report how loud a spot is (checked in here only)
exports.apiReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.session.user.id; // from the logged-in user, never from the request body

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid study spot id' });
    }
    if (!LEVELS.includes(status)) {
      return res.status(400).json({ message: `Noise level must be one of: ${LEVELS.join(', ')}` });
    }

    const spot = await StudySpot.findById(id);
    if (!spot) {
      return res.status(404).json({ message: 'Study spot not found' });
    }

    const mine = await getMyCheckIn(userId);
    if (!mine || String(mine.spot) !== String(id)) {
      return res.status(403).json({ message: 'Check in to this room to rate how loud it is.' });
    }

    await addReport(userId, id, status);

    // Send back the updated summary so the page can refresh straight away.
    res.status(201).json({ summary: summarise(await getRecentReports(id)), mine: status });
  } catch (err) {
    console.error('Noise report failed:', err);
    res.status(500).json({ message: 'Could not save your noise rating' });
  }
};

// GET /api/noise/heatmap?building=CONNEX  — current noise level of every reported spot in a building
exports.apiGetHeatmap = async (req, res) => {
  try {
    const { building } = req.query;
    if (typeof building !== 'string' || !building) {
      return res.status(400).json({ message: 'Building name is required' });
    }

    const spots = await StudySpot.findByBuilding(building);
    res.json(await getNoiseHeat(spots.map(s => s._id)));
  } catch (err) {
    console.error('Fetching the noise heatmap failed:', err);
    res.status(500).json({ message: 'Could not load the noise heatmap' });
  }
};

// GET /api/noise/:id  — current noise level + recent reports, and the logged-in user's own latest answer
exports.apiGetNoise = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid study spot id' });
    }

    const reports = await getRecentReports(req.params.id);
    const userId = req.session.user?.id;
    res.json({
      summary: summarise(reports),
      // Last 10 reports, without user ids so we don't expose who reported what.
      recent: reports.slice(0, 10).map(r => ({ status: r.status, createdAt: r.createdAt })),
      mine: reports.find(r => userId && String(r.userId) === String(userId))?.status ?? null,
    });
  } catch (err) {
    console.error('Fetching noise reports failed:', err);
    res.status(500).json({ message: 'Could not load the noise level' });
  }
};
