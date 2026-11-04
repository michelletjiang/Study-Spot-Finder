// JSON API for reports on reviews, used by routes/api/reports-routes.js.
// Report model: the reports collection.
const Report = require('../models/reports');
// Used to check that ids are well formed before querying.
const mongoose = require('mongoose');
// The allowed report reasons, the same list as the model.
const REASONS = ['Inaccurate', 'Offensive', 'Spam', 'Other'];
// Review model: used to find and delete the reported review.
const Review = require('../models/reviews-model');
// Who may report a review.
const { validateReportTarget } = require('../lib/reviews');

// ACTIVE: JSON API used by the Vue client (ReportFormView.vue and AdminReportsView.vue).
// ---------- JSON API (used by Vue) ----------

// Checks the reason and description. Returns an error message, or null.
// returns an error message, or null if the report is valid
function validateReport({ reason, description }) {
  if (!REASONS.includes(reason)) return 'Please choose a reason.';
  if (!String(description || '').trim()) return 'Description cannot be empty';
  return null;
}

// Helper: load a report with its review filled in, or send a 404 and return null.
// finds a report by :id (with its review filled in), or sends 404 and returns null
async function findReportOr404(req, res) {
  // A malformed id cannot exist, so skip the database in that case.
  const report = mongoose.isValidObjectId(req.params.id) ? await Report.findById(req.params.id).populate('reviewId') : null;
  if (!report) res.status(404).json({ message: 'Report not found' });
  return report;
}

// POST /api/reports: a student reports a review.
// POST /api/reports   body: { reviewId, reason, description }
exports.apiCreateReport = async (req, res) => {
  // Validate the body.
  const msg = validateReport(req.body);
  if (msg) return res.status(400).json({ message: msg });
  // The review id must be well formed.
  if (!mongoose.isValidObjectId(req.body.reviewId)) return res.status(404).json({ message: 'Review not found' });
  try {
    // Load the review being reported.
    const review = await Review.findByreviewId(req.body.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    // No reporting your own review, and one pending report per user per review.
    const username = req.session.user.username;
    const alreadyReported = !!(await Report.exists({ reviewId: review._id, reportedBy: username, status: 'Pending' }));
    const targetMsg = validateReportTarget(review, username, alreadyReported);
    if (targetMsg) return res.status(review.userId === username ? 403 : 409).json({ message: targetMsg });

    // Save the report, linked to the review and to the reporting username.
    const report = await Report.addReport({
      reviewId:    review._id,
      reason:      req.body.reason,
      description: req.body.description.trim(),
      status:      'Pending',
      reportedBy:  req.session.user.username
    });
    // 201 means created.
    res.status(201).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error submitting report' });
  }
};

// GET /api/reports/pending (admin): the moderation queue, oldest first.
// GET /api/reports/pending   (admin)
exports.apiPendingReports = async (req, res) => {
  try {
    // Fetch pending reports and fill in their review.
    res.json(await Report.find({ status: 'Pending' }).populate('reviewId').sort({ createdAt: 1 }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error loading reports' });
  }
};

// GET /api/reports/mine: the logged-in user's own reports, newest first, with their review filled in.
// An approved report's review has been deleted, so its reviewId comes back as null.
exports.apiMyReports = async (req, res) => {
  try {
    res.json(await Report.find({ reportedBy: req.session.user.username }).populate('reviewId').sort({ createdAt: -1 }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error loading your reports' });
  }
};

// GET /api/reports/:id: the reporter or an admin may read it.
// GET /api/reports/:id   (whoever filed it, or an admin)
exports.apiGetReport = async (req, res) => {
  try {
    const report = await findReportOr404(req, res);
    if (!report) return;
    // Anyone else gets 403.
    if (report.reportedBy !== req.session.user.username && req.session.user.role !== 'Admin')
      return res.status(403).json({ message: 'Not your report' });
    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error loading report' });
  }
};

// PUT /api/reports/:id: only the reporter, and only while Pending.
// PUT /api/reports/:id   (whoever filed it, while it is still pending)
exports.apiUpdateReport = async (req, res) => {
  try {
    const report = await findReportOr404(req, res);
    if (!report) return;
    // Only the reporter can edit.
    if (report.reportedBy !== req.session.user.username) return res.status(403).json({ message: 'Not your report' });
    // A reviewed report is locked: 409.
    if (report.status !== 'Pending') return res.status(409).json({ message: 'This report has already been reviewed' });
    const msg = validateReport(req.body);
    if (msg) return res.status(400).json({ message: msg });

    // Save the new description and reason.
    await Report.editReport(report._id, req.body.description.trim(), req.body.reason);
    res.json(await Report.findById(report._id).populate('reviewId'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating report' });
  }
};

// Shared code for approve and decline.
// approve = delete the review and close every pending report on it; decline = just close them
async function resolveReport(req, res, status) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Report not found' });
  try {
    // The report is not populated here so the raw review id is kept even if the review is gone.
    const report = await Report.findById(req.params.id); // not populated, so reviewId is the raw id even if the review is gone
    if (!report) return res.status(404).json({ message: 'Report not found' });
    // Approving deletes the reported review.
    if (status === 'Approved') await Review.deleteReview(report.reviewId);
    // Close every pending report on that review.
    await Report.updateMany({ reviewId: report.reviewId, status: 'Pending' }, { status: status });
    // Reply with a short message.
    res.json({ message: `Report ${status.toLowerCase()}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating report' });
  }
}

// POST /api/reports/:id/approve and /:id/decline use the shared function (admin only).
// POST /api/reports/:id/approve  and  /:id/decline   (admin)
exports.apiApproveReport = (req, res) => resolveReport(req, res, 'Approved');
exports.apiDeclineReport = (req, res) => resolveReport(req, res, 'Declined');
