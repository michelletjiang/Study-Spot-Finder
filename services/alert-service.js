// services/alert-service.js
// Shared alert logic: which alerts still count, and what the frontend is allowed to see.
// Used by the alerts controller, the nearby search (/find) and the favourites page.

const StudySpotAlert = require('../models/studyspot-alert-model');

const HIDE_MARGIN = 2; // hide once disputes beat confirms by 2

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

// Active alerts for many spots in one query: { spotId: [alerts, newest first] }.
// Spots with no active alerts are left out.
async function getActiveAlertsBySpot(spotIds, currentUserId = null) {
  if (!spotIds.length) return {};
  const alerts = await StudySpotAlert.find({
    spot: { $in: spotIds },
    resolved: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  const bySpot = {};
  for (const alert of alerts.filter(isActive)) {
    const key = String(alert.spot);
    (bySpot[key] ||= []).push(toPublic(alert, currentUserId));
  }
  return bySpot;
}

module.exports = { HIDE_MARGIN, isActive, toPublic, getActiveAlertsBySpot };
