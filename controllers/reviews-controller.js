// MIXED file: lines 1 to 137 are LEGACY EJS handlers used only by routes/reviews-route.js. The "JSON API" section from line 142 is ACTIVE and used by routes/api/reviews-routes.js.
// Review model: the reviews collection.
const Review = require('../models/reviews-model'); // path to model
const cascade = require('../services/cascade-service'); // deletes child records with their parent

// LEGACY - not used by the Vue demo: shows all reviews for one spot.
exports.showReview = async (req,res) => {
    // The spot name from the URL is used as the room id.
    const roomId =req.params.spotName // comes from auery
    // The logged-in username.
    const user = req.session.user.username
    const buildingName = req.params.building
    try{
        // Fetch reviews by building and room.
        let reviewList = await Review.findByRoom(buildingName,roomId.trim())
        console.log(reviewList)
        
        // Render views/display-reviews.ejs.
        res.render('display-reviews', {reviewList, user : user, building: buildingName})
    } catch (error) {
        console.error(error)
        res.send("Error reading database.")
    }
}

// LEGACY - not used by the Vue demo: shows the add-review form.
exports.showAddReview = async (req, res) => {
    const roomName = req.params.spotName
    const userName = req.session.user.username
    const building = req.params.building
    console.log(building)
    try{
        // Render views/add-review.ejs.
        await res.render("add-review", {result:null, msg:'', spotName : roomName, user : userName, building: building})
    } catch (error) {
        console.error(error)
        res.send("Error displaying form.")
    }
};

// LEGACY - not used by the Vue demo: saves a new review from the form.
// create a new review 
exports.createReview = async (req,res) => {
    const building = req.params.building
    // Read the form fields.
    const title= req.body.title;
    const content = req.body.content;
    const rating = req.body.rating;
    const roomName = req.body.spotName
    const user = req.session.user.username
    console.log(building)
    // Reject a form with a blank field.
    if (!title || !content || !rating) {
        return res.render("add-review", {result:null, msg:"All fields are required.", user : user, spotName:roomName, building: building});
    };

    // Build the review to save.
    let newReview = {
        buildingName : building,
        userId : user,
        roomId : roomName,
        title:title,
        content:content, 
        rating:rating,
    }
    
    try{
        // Save it and show the form with a success message.
        let result=await Review.addReview(newReview)
        console.log("mylog:"+result)
        res.render("add-review", {result:result, msg:"Review added!",user : user, spotName:roomName, building: building})
    } catch (error){
        console.error(error);
        res.render("add-review", {result:null,msg:"Error reading review",user : user, spotName:roomName, building: building})
    }
};

// LEGACY - not used by the Vue demo: lists one user's reviews. The comment below is an old class-exercise note.
//crud ex3 --> it has 2 ejs views, 3 functions (showReviewList, getReview, updateReview)
exports.showUserReviews = async(req,res)=> { // this is edit-books
  try {
    // Username of the logged-in user.
    const userName = req.session.user.username
    console.log(userName)
    // Fetch that user's reviews.
    let reviewList = await Review.findbyUser(userName)
    console.log(reviewList)
    // Render views/user-reviews.ejs.
    res.render("user-reviews", {reviewList,user : userName})
  } catch (error) {
    console.error(error);
    res.send("Error reading database.")
  }
}

// LEGACY - not used by the Vue demo: loads one review into the update form.
exports.getReview = async (req,res) => {
  const reviewId = req.params.reviewId

  try{
    let result=await Review.findByreviewId(reviewId)
    // Render views/update-review.ejs.
    res.render("update-review", {result:result || null , msg : '', building: result ? result.buildingName : null, spotName: result ? result.roomId : null})
  } catch (error){
    console.error(error);
    res.send("Error retrieving review")
  }
};

// LEGACY - not used by the Vue demo: saves an edited review.
exports.updateReview = async (req,res) => {
    const reviewId= req.body.reviewId;
    const title= req.body.title;
    const content = req.body.content;
    const rating = req.body.rating;

    try{
        // Existing weakness: when a field is blank the form is rendered but the code does not stop, so it goes on to update and render again.
        if (!title || !content || !rating) {
        let result=await Review.findByreviewId(reviewId)
        res.render("update-review", {result:result || null , msg : 'All fields are required.', building: result ? result.buildingName : null, spotName: result ? result.roomId : null})
        };
        // Write the new title, content and rating.
        let result = await Review.editReview(reviewId, title, content, rating)
        console.log(result)
        // Reload the saved review.
        let updated = await Review.findByreviewId(reviewId)
        // Render the form with a success message.
        res.render("update-review", {result: updated, msg: 'Review has been successfully updated.', building: updated.buildingName, spotName: updated.roomId})
    } catch (error){
        console.error(error)
        res.send("Error updating review")
    }
}; 

// LEGACY - not used by the Vue demo: shows the delete confirmation page.
exports.getMarkedReview = async (req,res) => {
    const reviewId= req.query.id;

    try {
        let result= await Review.findByreviewId(reviewId)

        res.render("show-marked-review", {result:result || null, msg: '' } )
    } catch (error){
        console.error(error)
        res.render("show-marked-review", {result: null, msg: 'Failed to load review.'})
  }
};

// LEGACY - not used by the Vue demo: deletes a review after confirmation.
exports.deleteAReview = async (req,res) => {
    const reviewId = req.body.id;
    const building = req.body.building;
    const spotName = req.body.spotName;
    console.log(reviewId)
    try{
        // Delete by id.
        let success = await Review.deleteReview(reviewId)
        console.log(success)
        // Redirect to the legacy review list.
        res.redirect(`/review-list/${building}/${spotName}`)
        }
     catch (error){
        console.error(error)
        res.send('Failed to delete review.')
    }
}




// ACTIVE: JSON API used by the Vue client (SpotDetailView.vue, ReviewFormView.vue, MyReviewsView.vue).
// ---------- JSON API (used by Vue) ----------
// Reviews are stored by buildingName + roomId (spot name) + userId (username), same as the old pages,
// so reviews written on the EJS pages still show up here.

// Used to check that ids are well formed.
const mongoose = require('mongoose');
// Spot model, to find the spot a review belongs to.
const StudySpot = require('../models/studyspot-model');

// Checks title, content, a rating from 1 to 5 and a noise level. Returns an error message or null.
// validateReview now lives in lib/reviews.js so it can be unit tested (test/unit/reviews.spec.js).
const { validateReview, validateVote, withVotes, sortByScore } = require('../lib/reviews');

// finds a review by :id, or sends 404 and returns null
// Helper: load a review by :id, or send a 404 and return null.
async function findReviewOr404(req, res) {
    const review = mongoose.isValidObjectId(req.params.id) ? await Review.findByreviewId(req.params.id) : null;
    if (!review) res.status(404).json({ message: 'Review not found' });
    return review;
}

// GET /api/reviews?spotId=: the reviews of one spot, newest first.
// GET /api/reviews?spotId=   (all reviews for one study spot, newest first)
exports.apiListReviews = async (req, res) => {
    // spotId is required and must be well formed.
    if (!mongoose.isValidObjectId(req.query.spotId)) return res.status(400).json({ message: 'spotId is required' });
    try {
        // Find the spot first, to get its building and name.
        const spot = await StudySpot.findById(req.query.spotId);
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });
        // Reviews are matched by building name and spot name. sort puts the newest first.
        const reviews = await Review.findByRoom(spot.buildingName, spot.name);
        // Add vote counts and the viewer's own vote, then show the most helpful first.
        res.json(sortByScore(reviews.map(r => withVotes(r, req.session.user.username))));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/reviews/mine: the logged-in user's reviews.
// GET /api/reviews/mine
exports.apiMyReviews = async (req, res) => {
    try {
        const reviews = await Review.findbyUser(req.session.user.username).sort({ createdAt: -1 });
        res.json(reviews.map(r => withVotes(r, req.session.user.username)));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/reviews/:id: one review.
// GET /api/reviews/:id
exports.apiGetReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (review) res.json(withVotes(review, req.session.user.username));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving review' });
    }
};

// POST /api/reviews: create a review for a spot.
// POST /api/reviews   body: { spotId, title, content, rating }
exports.apiCreateReview = async (req, res) => {
    const msg = validateReview(req.body);
    if (msg) return res.status(400).json({ message: msg });
    if (!mongoose.isValidObjectId(req.body.spotId)) return res.status(404).json({ message: 'Study spot not found' });
    try {
        const spot = await StudySpot.findById(req.body.spotId);
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });

        // Save the review under the spot's building and name and the user's name.
        const review = await Review.addReview({
            buildingName: spot.buildingName,
            userId:       req.session.user.username,
            roomId:       spot.name,
            title:        req.body.title.trim(),
            content:      req.body.content.trim(),
            rating:       Number(req.body.rating),
            noiseLevel:   req.body.noiseLevel
        });
        // 201 means created.
        res.status(201).json(withVotes(review, req.session.user.username));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding review' });
    }
};

// PUT /api/reviews/:id: only the author may edit.
// PUT /api/reviews/:id   (only the author - the old page let anyone edit any review)
exports.apiUpdateReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (!review) return;
        // Anyone else gets 403.
        if (review.userId !== req.session.user.username) return res.status(403).json({ message: 'You can only edit your own reviews' });
        const msg = validateReview(req.body);
        if (msg) return res.status(400).json({ message: msg });

        // Write the new values.
        await Review.editReview(review._id, req.body.title.trim(), req.body.content.trim(), Number(req.body.rating), req.body.noiseLevel);
        res.json(withVotes(await Review.findByreviewId(review._id), req.session.user.username));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating review' });
    }
};

// DELETE /api/reviews/:id: the author or an admin.
// DELETE /api/reviews/:id   (the author, or an admin)
exports.apiDeleteReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (!review) return;
        // Others get 403.
        if (review.userId !== req.session.user.username && req.session.user.role !== 'Admin')
            return res.status(403).json({ message: 'You can only delete your own reviews' });

        // Delete the review and every report filed against it.
        await cascade.deleteReview(review._id);
        // 204 means success with no body.
        res.status(204).end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete review' });
    }
};


// POST /api/reviews/:id/vote  body: { vote: 'up' | 'down' | 'none' }
// One vote per user per review; voting the other way switches it, 'none' removes it.
exports.apiVoteReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (!review) return;
        const username = req.session.user.username;
        const msg = validateVote(review, username, req.body.vote);
        if (msg) return res.status(msg.startsWith('You cannot') ? 403 : 400).json({ message: msg });
        const updated = await Review.voteReview(review._id, username, req.body.vote);
        res.json(withVotes(updated, username));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving vote' });
    }
};
