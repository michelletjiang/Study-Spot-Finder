const Review = require('../models/reviews-model'); // path to model

exports.showReview = async (req,res) => {
    const roomId =req.params.spotName // comes from auery
    const user = req.session.user.username
    const buildingName = req.params.building
    try{
        let reviewList = await Review.findByRoom(buildingName,roomId.trim())
        console.log(reviewList)
        
        res.render('display-reviews', {reviewList, user : user, building: buildingName})
    } catch (error) {
        console.error(error)
        res.send("Error reading database.")
    }
}

exports.showAddReview = async (req, res) => {
    const roomName = req.params.spotName
    const userName = req.session.user.username
    const building = req.params.building
    console.log(building)
    try{
        await res.render("add-review", {result:null, msg:'', spotName : roomName, user : userName, building: building})
    } catch (error) {
        console.error(error)
        res.send("Error displaying form.")
    }
};

// create a new review 
exports.createReview = async (req,res) => {
    const building = req.params.building
    const title= req.body.title;
    const content = req.body.content;
    const rating = req.body.rating;
    const roomName = req.body.spotName
    const user = req.session.user.username
    console.log(building)
    if (!title || !content || !rating) {
        return res.render("add-review", {result:null, msg:"All fields are required.", user : user, spotName:roomName, building: building});
    };

    let newReview = {
        buildingName : building,
        userId : user,
        roomId : roomName,
        title:title,
        content:content, 
        rating:rating,
    }
    
    try{
        let result=await Review.addReview(newReview)
        console.log("mylog:"+result)
        res.render("add-review", {result:result, msg:"Review added!",user : user, spotName:roomName, building: building})
    } catch (error){
        console.error(error);
        res.render("add-review", {result:null,msg:"Error reading review",user : user, spotName:roomName, building: building})
    }
};

//crud ex3 --> it has 2 ejs views, 3 functions (showReviewList, getReview, updateReview)
exports.showUserReviews = async(req,res)=> { // this is edit-books
  try {
    const userName = req.session.user.username
    console.log(userName)
    let reviewList = await Review.findbyUser(userName)
    console.log(reviewList)
    res.render("user-reviews", {reviewList,user : userName})
  } catch (error) {
    console.error(error);
    res.send("Error reading database.")
  }
}

exports.getReview = async (req,res) => {
  const reviewId = req.params.reviewId

  try{
    let result=await Review.findByreviewId(reviewId)
    res.render("update-review", {result:result || null , msg : '', building: result ? result.buildingName : null, spotName: result ? result.roomId : null})
  } catch (error){
    console.error(error);
    res.send("Error retrieving review")
  }
};

exports.updateReview = async (req,res) => {
    const reviewId= req.body.reviewId;
    const title= req.body.title;
    const content = req.body.content;
    const rating = req.body.rating;

    try{
        if (!title || !content || !rating) {
        let result=await Review.findByreviewId(reviewId)
        res.render("update-review", {result:result || null , msg : 'All fields are required.', building: result ? result.buildingName : null, spotName: result ? result.roomId : null})
        };
        let result = await Review.editReview(reviewId, title, content, rating)
        console.log(result)
        let updated = await Review.findByreviewId(reviewId)
        res.render("update-review", {result: updated, msg: 'Review has been successfully updated.', building: updated.buildingName, spotName: updated.roomId})
    } catch (error){
        console.error(error)
        res.send("Error updating review")
    }
}; 

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

exports.deleteAReview = async (req,res) => {
    const reviewId = req.body.id;
    const building = req.body.building;
    const spotName = req.body.spotName;
    console.log(reviewId)
    try{
        let success = await Review.deleteReview(reviewId)
        console.log(success)
        res.redirect(`/review-list/${building}/${spotName}`)
        }
     catch (error){
        console.error(error)
        res.send('Failed to delete review.')
    }
}




// ---------- JSON API (used by Vue) ----------
// Reviews are stored by buildingName + roomId (spot name) + userId (username), same as the old pages,
// so reviews written on the EJS pages still show up here.

const mongoose = require('mongoose');
const StudySpot = require('../models/studyspot-model');

const NOISE_LEVELS = ['Quiet', 'Moderate', 'Loud'];

// returns an error message, or null if the review is valid
function validateReview({ title, content, rating, noiseLevel }) {
    if (!String(title || '').trim() || !String(content || '').trim() || rating === undefined || rating === '' || !noiseLevel)
        return 'All fields are required.';
    if (!(Number(rating) >= 1 && Number(rating) <= 5)) return 'Rating must be between 1 and 5.';
    if (!NOISE_LEVELS.includes(noiseLevel)) return 'Noise level must be Quiet, Moderate or Loud.';
    return null;
}

// finds a review by :id, or sends 404 and returns null
async function findReviewOr404(req, res) {
    const review = mongoose.isValidObjectId(req.params.id) ? await Review.findByreviewId(req.params.id) : null;
    if (!review) res.status(404).json({ message: 'Review not found' });
    return review;
}

// GET /api/reviews?spotId=   (all reviews for one study spot, newest first)
exports.apiListReviews = async (req, res) => {
    if (!mongoose.isValidObjectId(req.query.spotId)) return res.status(400).json({ message: 'spotId is required' });
    try {
        const spot = await StudySpot.findById(req.query.spotId);
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });
        res.json(await Review.findByRoom(spot.buildingName, spot.name).sort({ createdAt: -1 }));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/reviews/mine
exports.apiMyReviews = async (req, res) => {
    try {
        res.json(await Review.findbyUser(req.session.user.username).sort({ createdAt: -1 }));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/reviews/:id
exports.apiGetReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (review) res.json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving review' });
    }
};

// POST /api/reviews   body: { spotId, title, content, rating, noiseLevel }
exports.apiCreateReview = async (req, res) => {
    const msg = validateReview(req.body);
    if (msg) return res.status(400).json({ message: msg });
    if (!mongoose.isValidObjectId(req.body.spotId)) return res.status(404).json({ message: 'Study spot not found' });
    try {
        const spot = await StudySpot.findById(req.body.spotId);
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });

        const review = await Review.addReview({
            buildingName: spot.buildingName,
            userId:       req.session.user.username,
            roomId:       spot.name,
            title:        req.body.title.trim(),
            content:      req.body.content.trim(),
            rating:       Number(req.body.rating),
            noiseLevel:   req.body.noiseLevel
        });
        res.status(201).json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding review' });
    }
};

// PUT /api/reviews/:id   (only the author - the old page let anyone edit any review)
exports.apiUpdateReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (!review) return;
        if (review.userId !== req.session.user.username) return res.status(403).json({ message: 'You can only edit your own reviews' });
        const msg = validateReview(req.body);
        if (msg) return res.status(400).json({ message: msg });

        await Review.editReview(review._id, req.body.title.trim(), req.body.content.trim(), Number(req.body.rating), req.body.noiseLevel);
        res.json(await Review.findByreviewId(review._id));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating review' });
    }
};

// DELETE /api/reviews/:id   (the author, or an admin)
exports.apiDeleteReview = async (req, res) => {
    try {
        const review = await findReviewOr404(req, res);
        if (!review) return;
        if (review.userId !== req.session.user.username && req.session.user.role !== 'Admin')
            return res.status(403).json({ message: 'You can only delete your own reviews' });

        await Review.deleteReview(review._id);
        res.status(204).end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete review' });
    }
};
