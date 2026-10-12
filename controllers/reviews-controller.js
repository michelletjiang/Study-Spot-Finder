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
exports.showUserReviews = async(req,res)=> {
  if (String(req.params.userId) !== String(req.session.user.id) && req.session.user.role !== 'Admin') return res.status(403).render('error', { message: 'You are not allowed to view these reviews.' });
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
    if (!result) return res.status(404).render('error', { message: 'Review not found.' });
    if (result.userId !== req.session.user.username && req.session.user.role !== 'Admin') return res.status(403).render('error', { message: 'You are not allowed to edit this review.' });
    res.render("update-review", {result:result || null , msg : '', building: result ? result.buildingName : null, spotName: result ? result.roomId : null})
  } catch (error){
    console.error(error);
    res.send("Error retrieving review")
  }
};

exports.updateReview = async (req,res) => {
    const reviewId= req.params.reviewId;
    const title= req.body.title;
    const content = req.body.content;
    const rating = req.body.rating;

    try{
        if (!title || !content || !rating) {
        let result=await Review.findByreviewId(reviewId)
        return res.render("update-review", {result:result || null , msg : 'All fields are required.', building: result ? result.buildingName : null, spotName: result ? result.roomId : null});
        }
        let result = await Review.editReview(reviewId, title, content, rating, req.session.user.username, req.session.user.role === 'Admin')
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
        let success = await Review.deleteReview(reviewId, req.session.user.username, req.session.user.role === 'Admin')
        console.log(success)
        res.redirect(`/review-list/${building}/${spotName}`)
        }
     catch (error){
        console.error(error)
        res.send('Failed to delete review.')
    }
}



