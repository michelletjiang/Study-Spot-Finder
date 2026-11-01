// ACTIVE: model for study spot reviews. Used by controllers/reviews-controller.js. Spots are matched by buildingName and roomId, not by an ObjectId link.
// model.js talks to mongoDB, defines schema and handles data operations

// mongoose is the MongoDB library.
const mongoose = require('mongoose');
// Create a new ‘review' schema // userid, reviewid, title, content, rating
// Schema: the fields in every review.
const reviewSchema = new mongoose.Schema({
    // The building the reviewed spot belongs to.
    buildingName:{
        type: String,
        required: true
    },
    // Id of the user who wrote it, stored as a string.
    userId: {
        type: String, 
        ref: "User", // if want to use in controller.js, use user._id// req.user._id if retrieving from form. this way it comes from login/session
        required: true // ensures every review is tied to a user
    }, 

    // roomId is the id of the study spot being reviewed (kept as text).
    roomId:{
        type: String,
        ref:"StudySpot", // subj to change acc to studyspot db
        required: true 
    },

//    reviewid:{
//        type:mongoose.Schema.Types.ObjectId,
//        ref:"reviews",
//        unique:true
//    },  there is a default reviewId created by mongodb, --> use review._id !!/ req.review._id if retrieving from form

    
    // Short title, required.
    title: {
        type:String,
        required: [true, 'A review must have a title.']
    }, 

    // Review text, required.
    content:{
        type:String,
        required:[true, 'A review must have content.']
    },

    // Star rating; defaults to 3 when not provided.
    rating:{
        type:Number,
        default:3.0
    }
// timestamps adds createdAt and updatedAt.
}, {timestamps:true}); // auto gives createdAt, updatedAt

// Register the model: name Review, collection "reviews".
const Review = mongoose.model('Review', reviewSchema, "reviews")
// "Review" = model name, used in my code
// "reviews" = collection(aka folder) name, used in mongoDB
// Reviews written by one user (the My Reviews page).
exports.findbyUser = function(userId){
    return Review.find({userId : userId})
}
// Reviews for one spot, matched by building name and spot id (the spot detail page).
exports.findByRoom = function(buildingName, roomId){ // retrieve all reviews for a certain room => so i need the roomid as argument?
    return Review.find({buildingName:buildingName, roomId : roomId})
};

// One row per spot: { _id: { buildingName, roomId }, count, avgRating, avgNoise }, used by the study spot finder
// (controllers/nearby-controller.js). avgNoise: Quiet 1 .. Loud 5, null if no review gave a noise level.
exports.summariseAll = function(){
    return Review.aggregate([
        { $group: {
            _id: { buildingName: '$buildingName', roomId: '$roomId' },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            avgNoise: { $avg: { $switch: { branches: [
                { case: { $eq: ['$noiseLevel', 'Quiet'] }, then: 1 },
                { case: { $eq: ['$noiseLevel', 'Moderate'] }, then: 3 },
                { case: { $eq: ['$noiseLevel', 'Loud'] }, then: 5 },
            ], default: null } } } // $avg skips nulls
        } }
    ])
};

// Create a review.
exports.addReview = function(newReview) {
    return Review.create(newReview)
};

// Find one review by its id.
exports.findByreviewId = function (reviewId) {
    return Review.findById(reviewId)
};

// Update the title, content and rating of a review.
exports.editReview = function(reviewId, title, content, rating){ // first parameter = primary key users shld input
    return Review.findByIdAndUpdate(reviewId, // primary key. this is the query object passed to updateOne. it tells mongoDB to find a review where _id=reviewId & userId=the logged-in user
        {
            title:title, 
            content:content, 
            rating:rating
        }
    )
};

// Delete a review by id.
exports.deleteReview = function (reviewId){
    return Review.findOneAndDelete({_id:reviewId})
};

