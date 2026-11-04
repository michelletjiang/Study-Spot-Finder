// services/noise-service.js
// Live noise levels: students checked in to a spot say how loud it is, and the floor plan's heatmap
// shows the average of the last hour. Who may report is checked in controllers/noise-controller.js.

const NoiseReport = require('../models/noise-report-model');

const LEVELS = ['Quiet', 'Moderate', 'Loud'];
const FRESH_WINDOW_MS = 60 * 60 * 1000; // only count reports from the last hour
const CHANGE_WINDOW_MS = 10 * 60 * 1000; // a new answer within 10 minutes replaces your last one

// Reports for one spot from the last hour, newest first.
async function getRecentReports(spotId) {
  const since = new Date(Date.now() - FRESH_WINDOW_MS);
  return NoiseReport.find({ spot: spotId, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .lean();
}

// Newer reports count more: a report from just now has weight 1,
// one from an hour ago has weight 0.25.
function reportWeight(report, now) {
  const age = now - new Date(report.createdAt).getTime();
  return Math.max(0.25, 1 - 0.75 * (age / FRESH_WINDOW_MS));
}

// Turns a list of reports into one "current" level.
function summarise(reports) {
  if (!reports.length) {
    return { current: null, lastReportedAt: null, count: 0 };
  }

  const now = Date.now();
  const scores = { Quiet: 0, Moderate: 0, Loud: 0 };

  for (const r of reports) {
    scores[r.status] += reportWeight(r, now);
  }

  const current = LEVELS.reduce((best, level) =>
    scores[level] > scores[best] ? level : best, LEVELS[0]);

  return {
    current,
    lastReportedAt: reports[0].createdAt,
    count: reports.length,
  };
}

// The weighted average level from 0 (Quiet) to 2 (Loud), for the heatmap's colours.
// Unlike summarise(), a room split between Quiet and Loud lands in the middle.
function noiseScore(reports) {
  const now = Date.now();
  let total = 0;
  let weights = 0;

  for (const r of reports) {
    const weight = reportWeight(r, now);
    total += LEVELS.indexOf(r.status) * weight;
    weights += weight;
  }

  return total / weights;
}

// spot id -> { score, current, lastReportedAt, count }. Spots with no recent reports are left out.
async function getNoiseHeat(spotIds) {
  const since = new Date(Date.now() - FRESH_WINDOW_MS);
  const reports = await NoiseReport.find({ spot: { $in: spotIds }, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .lean();

  const bySpot = new Map();
  for (const r of reports) {
    const id = String(r.spot);
    if (!bySpot.has(id)) bySpot.set(id, []);
    bySpot.get(id).push(r);
  }

  const heat = {};
  for (const [id, spotReports] of bySpot) {
    heat[id] = { score: noiseScore(spotReports), ...summarise(spotReports) };
  }
  return heat;
}

// Save a student's answer. Changing it soon after replaces the old one, so a mis-tap isn't counted
// and nobody can outweigh a room by tapping repeatedly.
async function addReport(userId, spotId, status) {
  const since = new Date(Date.now() - CHANGE_WINDOW_MS);
  await NoiseReport.deleteMany({ spot: spotId, userId, createdAt: { $gte: since } });
  return NoiseReport.create({ spot: spotId, userId, status });
}

module.exports = { LEVELS, FRESH_WINDOW_MS, getRecentReports, summarise, noiseScore, getNoiseHeat, addReport };
