// services/crowd-service.js
// Shared crowd-level logic. The discovery/ranking teammate can import getCurrentCrowd().

const CrowdReport = require('../models/crowd-report-model');

const LEVELS = ['Quiet', 'Moderate', 'Busy', 'Full'];
const FRESH_WINDOW_MS = 2 * 60 * 60 * 1000; // only count reports from the last 2 hours

// Reports for one spot from the last 2 hours, newest first.
async function getRecentReports(spotId) {
  const since = new Date(Date.now() - FRESH_WINDOW_MS);
  return CrowdReport.find({ spot: spotId, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .lean();
}

// Turns a list of reports into one "current" level.
// Newer reports count more: a report from just now has weight 1,
// one from 2 hours ago has weight 0.25.
function summarise(reports) {
  if (!reports.length) {
    return { current: null, lastReportedAt: null, count: 0 };
  }

  const now = Date.now();
  const scores = { Quiet: 0, Moderate: 0, Busy: 0, Full: 0 };

  for (const r of reports) {
    const age = now - new Date(r.createdAt).getTime();
    const weight = Math.max(0.25, 1 - 0.75 * (age / FRESH_WINDOW_MS));
    scores[r.status] += weight;
  }

  const current = LEVELS.reduce((best, level) =>
    scores[level] > scores[best] ? level : best
  );

  return {
    current,                              // e.g. 'Busy'
    lastReportedAt: reports[0].createdAt, // newest report, for "reported 15 min ago"
    count: reports.length,
  };
}

// One-call helper for other teammates: getCurrentCrowd(spotId) -> { current, lastReportedAt, count }
async function getCurrentCrowd(spotId) {
  return summarise(await getRecentReports(spotId));
}

module.exports = { LEVELS, FRESH_WINDOW_MS, getRecentReports, summarise, getCurrentCrowd };