const Report = require('../models/reports');
const Review = require('../models/reviews-model');

// GET route - when opening report form, finds review from reviewId to reference in the report form
exports.findReviewforReport = async (req, res) =>{
  try{
      const review = await Review.findByreviewId(req.params.reviewId);
      console.log(review) // checks for the review content
      if (!review){
        return res.render("error", {message: "Error loading report form"}) // if review is not found from link, show error
      }

      res.render("new-report",{ review, msg: "" }) // show report page with loaded review details
  } catch (err){
    console.log(err)
    res.render("error", {message: "Error loading report form"})
  }
} ;

// POST route - when report is uploaded by user, posts report to the db
exports.uploadReport = async (req,res) => {

    const review = await Review.findByreviewId(req.params.reviewId);
    const reason = req.body.reason;
    const description = req.body.description;
    const reportBy = req.session.user.username
    if (!description || description.trim() == ""){
      return res.render('new-report',{ review, msg: 'All fields are required'})
    }

    const newReport = {
      reviewId : review._id,
      reason : reason,
      description : description,
      status : 'Pending',
      reportedBy : reportBy
    }
    console.log(newReport) // shows the report to be posted to db
try {
    let msg="";
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

// GET route to edit report
exports.editReport = async (req,res) => {
  const report = await Report.findById(req.params.reportId); // finds report from the query
  console.log(report)
  console.log("reportId param:", req.params.reportId);
  res.render('edit-report', { report, msg: '' }) // renders the edit report form with pre-filled fields
}

// POST route to update report in the db
exports.updateReport = async (req,res) => {
  const reportId = req.params.reportId 
  const editedReason = req.body.reason
  const editedDescription = req.body.description
  const report = await Report.findById(req.params.reportId) // find report in database
  if (!editedDescription || editedDescription.trim() == ""){ // makes sure description cannot be empty
      return res.render('edit-report',{report, msg: 'Description cannot be empty'})
    }
  try {
      let success= await Report.editReport(reportId,editedDescription,editedReason); // sends updated fields to report in database
      console.log(success);
      res.send(`Report has been successfully updated. <br> <a href="/studyspot-list">Back to list</a> `)
    } catch (error) {
      console.error(error);
     
    }};

// GET route - show admin page of pending reports
exports.adminDisplayReports = async (req, res) => {
  try {
    const pendingReports = await Report.find({status : "Pending"}) // find all reports with status as pending
    .populate("reviewId"); // fills in reviewId with the actual review object
    console.log(pendingReports); // shows all pending reports in console
    res.render("admin-reports", { reports: pendingReports });
  } catch (err) {
    console.log(err);
    res.send("Error loading reports");
  }
};

// POST route - if approved, deletes ref review and updates report status to approved. if declined, just updates report status to declined
exports.updateAdminDisplayReports = async (req,res) => {
  console.log("BODY:", req.body);
  const reportId = req.body.reportId
  const action = req.body.action
  const report = await Report.findById(reportId); // finds report from db
  const reviewId = report.reviewId // pulls review id from report
  
  try {
    if (action == 'approve'){
      await Review.deleteReview(reviewId) // deletes review with ref review id from above
      await Report.updateMany({reviewId : reviewId},{status : 'Approved'}) // updates all reports that ref above review id to approved
    } else if (action == 'decline'){
      await Report.updateMany({reviewId : reviewId},{status : 'Declined'}) // updates all reports that ref above review id to declined
    };
    const pendingReports = await Report.find({status : "Pending"}).populate('reviewId'); // find all reports with status as pending, then fills in reviewId with the actual review object
    console.log(pendingReports);
    res.render("admin-reports", { reports: pendingReports });
  } catch (err) {
    console.log(err);
    res.send("Error loading reports");
  }};