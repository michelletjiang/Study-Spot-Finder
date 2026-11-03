// controllers/checkin-controller.js
// Check in to a study spot ("I'm sitting here"), check out, and how many seats are free.
// The rules (3-hour limit, one spot at a time, busiest times) live in services/checkin-service.js.

const mongoose = require('mongoose');
const StudySpot = require('../models/studyspot-model');
const { countCheckedIn, getMyCheckIn, checkIn, checkOut, getWeeklyPattern } = require('../services/checkin-service');

// What the page gets about the user's own check-in.
async function toPublic(checkIn) {
  if (!checkIn) return null;
  const spot = await StudySpot.findById(checkIn.spot);
  return {
    spot: checkIn.spot,
    spotName: spot?.name ?? null,
    buildingName: spot?.buildingName ?? null,
    createdAt: checkIn.createdAt,
    endsAt: checkIn.endsAt,
  };
}

// Fresh counts for the spots a request changed, including 0 for a spot that's now empty.
async function countsFor(spotIds) {
  const ids = spotIds.filter(Boolean);
  const counts = await countCheckedIn(ids);
  return Object.fromEntries(ids.map(id => [String(id), counts[String(id)] || 0]));
}

// GET /api/checkins?spots=id1,id2,...  — how many people are checked in to each spot (public)
// Answers { spotId: count }, leaving out spots with nobody checked in.
exports.apiCounts = async (req, res) => {
  try {
    const spotIds = String(req.query.spots || '')
      .split(',')
      .filter(id => mongoose.isValidObjectId(id))
      .slice(0, 200); // a floor never has this many rooms
    res.json(await countCheckedIn(spotIds));
  } catch (err) {
    console.error('Counting check-ins failed:', err);
    res.status(500).json({ message: 'Could not load check-ins' });
  }
};

// GET /api/checkins/me  — where the logged-in user is checked in: { checkIn } (null if nowhere)
exports.apiMine = async (req, res) => {
  try {
    res.json({ checkIn: await toPublic(await getMyCheckIn(req.session.user.id)) });
  } catch (err) {
    console.error('Fetching my check-in failed:', err);
    res.status(500).json({ message: 'Could not load your check-in' });
  }
};

// POST /api/checkins/:spotId  — check in here (logged in). Moves you out of any other spot.
// Answers { checkIn, counts: { spotId: count }, previous: { spotName } | null }
exports.apiCheckIn = async (req, res) => {
  try {
    const { spotId } = req.params;
    const userId = req.session.user.id; // from the logged-in user, never from the request body

    if (!mongoose.isValidObjectId(spotId)) {
      return res.status(400).json({ message: 'Invalid study spot id' });
    }
    const spot = await StudySpot.findById(spotId);
    if (!spot) {
      return res.status(404).json({ message: 'Study spot not found' });
    }

    // already here: nothing to do (and the 3 hours don't restart)
    const mine = await getMyCheckIn(userId);
    if (mine && String(mine.spot) === String(spotId)) {
      return res.json({ checkIn: await toPublic(mine), counts: await countsFor([spotId]), previous: null, alreadyHere: true });
    }

    const here = (await countCheckedIn([spotId]))[String(spotId)] || 0;
    if (here >= spot.seatCount) {
      return res.status(409).json({ message: `All ${spot.seatCount} seats here are taken by people who checked in.` });
    }

    const { checkIn: created, previousSpotId } = await checkIn(userId, spotId);
    const previousSpot = previousSpotId ? await StudySpot.findById(previousSpotId) : null;
    res.status(201).json({
      checkIn: await toPublic(created),
      counts: await countsFor([spotId, previousSpotId]),
      previous: previousSpot ? { spotName: previousSpot.name, buildingName: previousSpot.buildingName } : null,
    });
  } catch (err) {
    console.error('Check-in failed:', err);
    res.status(500).json({ message: 'Could not check you in' });
  }
};

// DELETE /api/checkins/me  — check out of wherever you are (logged in). Answers { counts }
exports.apiCheckOut = async (req, res) => {
  try {
    const spotId = await checkOut(req.session.user.id);
    if (!spotId) {
      return res.status(404).json({ message: "You're not checked in anywhere." });
    }
    res.json({ counts: await countsFor([spotId]) });
  } catch (err) {
    console.error('Check-out failed:', err);
    res.status(500).json({ message: 'Could not check you out' });
  }
};

// GET /api/checkins/:spotId/pattern  — how full the spot usually is by weekday and hour (the "Busiest times" chart)
exports.apiPattern = async (req, res) => {
  try {
    const { spotId } = req.params;
    if (!mongoose.isValidObjectId(spotId)) {
      return res.status(400).json({ message: 'Invalid study spot id' });
    }
    const spot = await StudySpot.findById(spotId);
    if (!spot) {
      return res.status(404).json({ message: 'Study spot not found' });
    }
    res.json(await getWeeklyPattern(spot));
  } catch (err) {
    console.error('Fetching busiest times failed:', err);
    res.status(500).json({ message: 'Could not load busiest times' });
  }
};
