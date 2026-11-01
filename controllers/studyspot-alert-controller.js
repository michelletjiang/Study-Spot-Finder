// controllers/studyspot-alert-controller.js
// Community-reported issues for a study spot (closed, aircon, Wi-Fi...).
// Other students confirm ("still happening") or dispute ("not anymore").

const mongoose = require('mongoose');
const StudySpotAlert = require('../models/studyspot-alert-model');
const StudySpot = require('../models/studyspot-model'); 

const ALERT_TYPES = ['Closed', 'Aircon', 'WiFi', 'Event', 'Other'];
const ALERT_LIFETIME_MS = 2 * 60 * 60 * 1000;   // a new alert lasts 2 hours
const CONFIRM_EXTENDS_MS = 60 * 60 * 1000;      // a confirm keeps it alive at least 1 more hour
const MAX_LIFETIME_MS = 6 * 60 * 60 * 1000;     // but never longer than 6 hours after it was posted
const HIDE_MARGIN = 2;                          // hide once disputes beat confirms by 2
const CREATE_COOLDOWN_MS = 30 * 60 * 1000;      // one new alert per user per spot every 30 min

// ---------- helpers ----------

// Is this alert still worth showing?
function isActive(alert) {
  return !alert.resolved
    && alert.expiresAt > new Date()
    && (alert.disputes.length - alert.confirms.length) < HIDE_MARGIN;
}

// What the frontend gets: counts instead of user id lists, plus how *this* user voted.
function toPublic(alert, currentUserId) {
  const me = currentUserId ? String(currentUserId) : null;
  return {
    _id: alert._id,
    spot: alert.spot,
    type: alert.type,
    description: alert.description,
    createdAt: alert.createdAt,
    expiresAt: alert.expiresAt,
    confirmCount: alert.confirms.length,
    disputeCount: alert.disputes.length,
    myVote: !me ? null
      : alert.confirms.some(id => String(id) === me) ? 'confirm'
      : alert.disputes.some(id => String(id) === me) ? 'dispute'
      : null,
    isMine: me !== null && String(alert.userId) === me, // lets the page show a "Mark resolved" button
  };
}

function currentUserId(req) {
  return req.session.user ? req.session.user.id : null;
}

// ---------- handlers ----------

// GET /api/alerts/spot/:spotId — active alerts for one spot (public)
exports.apiGetAlerts = async (req, res) => {
  try {
    const { spotId } = req.params;
    if (!mongoose.isValidObjectId(spotId)) {
      return res.status(400).json({ message: 'Invalid study spot id' });
    }

    const alerts = await StudySpotAlert.find({
      spot: spotId,
      resolved: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    const userId = currentUserId(req);
    res.json(alerts.filter(isActive).map(a => toPublic(a, userId)));
  } catch (err) {
    console.error('Fetching alerts failed:', err);
    res.status(500).json({ message: 'Could not load alerts' });
  }
};

// POST /api/alerts/spot/:spotId — report an issue (logged in)
// Body: { "type": "Aircon", "description": "Room is really warm" }
exports.apiCreateAlert = async (req, res) => {
  try {
    const { spotId } = req.params;
    const userId = currentUserId(req);
    const { type } = req.body;
    const description = (req.body.description || '').trim().slice(0, 300);

    if (!mongoose.isValidObjectId(spotId)) {
      return res.status(400).json({ message: 'Invalid study spot id' });
    }
    if (!ALERT_TYPES.includes(type)) {
      return res.status(400).json({ message: `Type must be one of: ${ALERT_TYPES.join(', ')}` });
    }
    const spot = await StudySpot.findById(spotId);
    if (!spot) {
      return res.status(404).json({ message: 'Study spot not found' });
    }

    // Same issue already reported and still active? Count this as a confirm instead of a duplicate.
    const existing = await StudySpotAlert.findOne({
      spot: spotId,
      type,
      resolved: false,
      expiresAt: { $gt: new Date() },
    });
    if (existing && isActive(existing)) {
      applyVote(existing, userId, 'confirm');
      await existing.save();
      return res.status(200).json({
        merged: true,
        message: 'Someone already reported this, so we added your confirmation.',
        alert: toPublic(existing, userId),
      });
    }

    // Anti-spam: one new alert per user per spot every 30 minutes.
    const recent = await StudySpotAlert.findOne({
      spot: spotId,
      userId,
      createdAt: { $gte: new Date(Date.now() - CREATE_COOLDOWN_MS) },
    });
    if (recent) {
      return res.status(429).json({ message: 'You reported an issue here recently. Please try again later.' });
    }

    const alert = await StudySpotAlert.create({
      spot: spotId,
      userId,
      type,
      description,
      confirms: [userId], // the reporter counts as the first confirm
      disputes: [],
      expiresAt: new Date(Date.now() + ALERT_LIFETIME_MS),
    });

    res.status(201).json({ merged: false, alert: toPublic(alert, userId) });
  } catch (err) {
    console.error('Creating alert failed:', err);
    res.status(500).json({ message: 'Could not create alert' });
  }
};

// Puts the user in exactly one of confirms/disputes (or neither, if they click the same button again).
function applyVote(alert, userId, vote) {
  const me = String(userId);
  const hadConfirm = alert.confirms.some(id => String(id) === me);
  const hadDispute = alert.disputes.some(id => String(id) === me);

  alert.confirms = alert.confirms.filter(id => String(id) !== me);
  alert.disputes = alert.disputes.filter(id => String(id) !== me);

  const togglingOff = (vote === 'confirm' && hadConfirm) || (vote === 'dispute' && hadDispute);
  if (togglingOff) return;

  if (vote === 'confirm') {
    alert.confirms.push(userId);
    // Keep confirmed issues alive a bit longer, up to the max lifetime.
    const extended = Date.now() + CONFIRM_EXTENDS_MS;
    const cap = new Date(alert.createdAt || Date.now()).getTime() + MAX_LIFETIME_MS;
    if (extended > alert.expiresAt.getTime()) {
      alert.expiresAt = new Date(Math.min(extended, cap));
    }
  } else {
    alert.disputes.push(userId);
  }
}

// POST /api/alerts/:alertId/vote — confirm or dispute (logged in)
// Body: { "vote": "confirm" | "dispute" }   (sending the same vote again removes it)
exports.apiVoteAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = currentUserId(req);
    const { vote } = req.body;

    if (!mongoose.isValidObjectId(alertId)) {
      return res.status(400).json({ message: 'Invalid alert id' });
    }
    if (!['confirm', 'dispute'].includes(vote)) {
      return res.status(400).json({ message: 'Vote must be "confirm" or "dispute"' });
    }

    const alert = await StudySpotAlert.findById(alertId);
    if (!alert || !isActive(alert)) {
      return res.status(404).json({ message: 'This alert is no longer active' });
    }

    applyVote(alert, userId, vote);
    await alert.save();

    res.json({ alert: toPublic(alert, userId), stillActive: isActive(alert) });
  } catch (err) {
    console.error('Voting on alert failed:', err);
    res.status(500).json({ message: 'Could not record vote' });
  }
};

// PATCH /api/alerts/:alertId/resolve — the original reporter or an admin marks it fixed (logged in)
exports.apiResolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const user = req.session.user;

    if (!mongoose.isValidObjectId(alertId)) {
      return res.status(400).json({ message: 'Invalid alert id' });
    }

    const alert = await StudySpotAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    const isOwner = String(alert.userId) === String(user.id);
    const isAdmin = user.role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only the reporter or an admin can resolve this alert' });
    }

    alert.resolved = true;
    await alert.save();
    res.json({ message: 'Alert marked as resolved' });
  } catch (err) {
    console.error('Resolving alert failed:', err);
    res.status(500).json({ message: 'Could not resolve alert' });
  }
};