// MIXED file: lines 4 to 117 are LEGACY EJS handlers used only by routes/report-routes.js. The "JSON API" section from line 118 is ACTIVE and used by routes/api/reports-routes.js.
// Report model: the reports collection.
const Report = require('../models/reports');
// Review model: used to find and delete the reported review.
const Review = require('../models/reviews-model');

// LEGACY - not used by the Vue demo: shows the report form for one review.
// GET route - when opening report form, finds review from reviewId to reference in the report form
exports.findReviewforReport = async (req, res) =>{
  try{
      // Find the review named in the URL.
      const review = await Review.findByreviewId(req.params.reviewId);
      console.log(review) // checks for the review content
      // No review: show the error page.
      if (!review){
        return res.render("error", {message: "Error loading report form"}) // if review is not found from link, show error
      }

      // Render views/new-report.ejs with the review.
      res.render("new-report",{ review, msg: "" }) // show report page with loaded review details
  } catch (err){
    console.log(err)
    res.render("error", {message: "Error loading report form"})
  }
} ;

// LEGACY - not used by the Vue demo: saves a submitted report form.
// POST route - when report is uploaded by user, posts report to the db
exports.uploadReport = async (req,res) => {

    // Load the reported review.
    const review = await Review.findByreviewId(req.params.reviewId);
    const reason = req.body.reason;
    const description = req.body.description;
    // The reporter is the logged-in user.
    const reportBy = req.session.user.username
    // The description may not be blank.
    if (!description || description.trim() == ""){
      return res.render('new-report',{ review, msg: 'All fields are required'})
    }

    // Build the report to save.
    const newReport = {
      reviewId : review._id,
      reason : reason,
      description : description,
      status : 'Pending',
      reportedBy : reportBy
    }
    console.log(newReport) // shows the report to be posted to db
// Save it, then show views/report-outcome.ejs.
try {
    let msg="";
    // Add the report to the database.
    let result= await Report.addReport(newReport); // adds report to db
    console.log("mylog:" +result);
    console.log(result._id);
    
    const reportId = result._id
    res.render("report-outcome", {result:result ||null, msg, report : newReport, reviewText : review.content, reportId: reportId}); // show report to user

  } catch (error) {
    console.error(error);
    let result="fail";
    let msg="";
    res.render("report-outcome", {result,msg}); 
   
  }
}

// LEGACY - not used by the Vue demo: shows the edit form for a report.
// GET route to edit report
exports.editReport = async (req,res) => {
  // Load the report by id.
  const report = await Report.findById(req.params.reportId); // finds report from the query
  console.log(report)
  console.log("reportId param:", req.params.reportId);
  // Render views/edit-report.ejs.
  res.render('edit-report', { report, msg: '' }) // renders the edit report form with pre-filled fields
}

// LEGACY - not used by the Vue demo: saves edits to a report.
// POST route to update report in the db
exports.updateReport = async (req,res) => {
  const reportId = req.params.reportId 
  const editedReason = req.body.reason
  const editedDescription = req.body.description
  // Load the report so the form can be redisplayed.
  const report = await Report.findById(req.params.reportId) // find report in database
  // The description may not be blank.
  if (!editedDescription || editedDescription.trim() == ""){ // makes sure description cannot be empty
      return res.render('edit-report',{report, msg: 'Description cannot be empty'})
    }
  try {
      // Write the new reason and description.
      let success= await Report.editReport(reportId,editedDescription,editedReason); // sends updated fields to report in database
      console.log(success);
      // Reply with a small inline HTML message.
      res.send(`Report has been successfully updated. <br> <a href="/studyspot-list">Back to list</a> `)
    } catch (error) {
      console.error(error);
     
    }};

// LEGACY - not used by the Vue demo: admin page listing pending reports.
// GET route - show admin page of pending reports
exports.adminDisplayReports = async (req, res) => {
  try {
    // Find reports with status Pending.
    const pendingReports = await Report.find({status : "Pending"}) // find all reports with status as pending
    // populate replaces each reviewId with the full review document.
    .populate("reviewId"); // fills in reviewId with the actual review object
    console.log(pendingReports); // shows all pending reports in console
    // Render views/admin-reports.ejs.
    res.render("admin-reports", { reports: pendingReports });
  } catch (err) {
    console.log(err);
    res.send("Error loading reports");
  }
};

// LEGACY - not used by the Vue demo: admin approves or declines a report from an HTML form.
// POST route - if approved, deletes ref review and updates report status to approved. if declined, just updates report status to declined
exports.updateAdminDisplayReports = async (req,res) => {
  console.log("BODY:", req.body);
  // Read the report id and the chosen action.
  const reportId = req.body.reportId
  const action = req.body.action
  // Load the report.
  const report = await Report.findById(reportId); // finds report from db
  // The review it points to.
  const reviewId = report.reviewId // pulls review id from report
  
  try {
    // Approve: delete the review, then mark all reports of that review as Approved.
    if (action == 'approve'){
      await Review.deleteReview(reviewId) // deletes review with ref review id from above
      await Report.updateMany({reviewId : reviewId},{status : 'Approved'}) // updates all reports that ref above review id to approved
    // Decline: only mark the reports as Declined.
    } else if (action == 'decline'){
      await Report.updateMany({reviewId : reviewId},{status : 'Declined'}) // updates all reports that ref above review id to declined
    };
    // Show the refreshed pending list.
    const pendingReports = await Report.find({status : "Pending"}).populate('reviewId'); // find all reports with status as pending, then fills in reviewId with the actual review object
    console.log(pendingReports);
    res.render("admin-reports", { reports: pendingReports });
  } catch (err) {
    console.log(err);
    res.send("Error loading reports");
  }};
// ACTIVE: JSON API used by the Vue client (ReportFormView.vue and AdminReportsView.vue).
// ---------- JSON API (used by Vue) ----------

// Used to check that ids are well formed.
const mongoose = require('mongoose');

// The allowed report reasons, the same list as the model.
const REASONS = ['Inaccurate', 'Offensive', 'Spam', 'Other'];

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
