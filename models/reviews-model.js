// model.js talks to mongoDB, defines schema and handles data operations

const mongoose = require('mongoose');
// Create a new ‘review' schema // userid, reviewid, title, content, rating
const reviewSchema = new mongoose.Schema({
    buildingName:{
        type: String,
        required: true
    },
    userId: {
        type: String, 
        ref: "User", // if want to use in controller.js, use user._id// req.user._id if retrieving from form. this way it comes from login/session
        required: true // ensures every review is tied to a user
    }, 

    roomId:{
        type: String,
        ref:"studySpot", // subj to change acc to studyspot db
        required: true 
    },

//    reviewid:{
//        type:mongoose.Schema.Types.ObjectId,
//        ref:"reviews",
//        unique:true
//    },  there is a default reviewId created by mongodb, --> use review._id !!/ req.review._id if retrieving from form

    
    title: {
        type:String,
        required: [true, 'A review must have a title.']
    }, 

    content:{
        type:String,
        required:[true, 'A review must have content.']
    },

    rating:{
        type:Number,
        default:3.0
    },

    noiseLevel:{
        type:String,
        enum:['Quiet','Moderate','Loud'] // not required here so older reviews (and the old EJS form) still work; the JSON API requires it
    }
}, {timestamps:true}); // auto gives createdAt, updatedAt

const Review = mongoose.model('Review', reviewSchema, "reviews")
// "Review" = model name, used in my code
// "reviews" = collection(aka folder) name, used in mongoDB
exports.findbyUser = function(userId){
    return Review.find({userId : userId})
}
exports.findByRoom = function(buildingName, roomId){ // retrieve all reviews for a certain room => so i need the roomid as argument?
    return Review.find({buildingName:buildingName, roomId : roomId})
};

// one row per room: { _id: { buildingName, roomId }, count, avgRating, avgNoise } (avgNoise: Quiet 1 .. Loud 5, null if no review gave one)
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

exports.addReview = function(newReview) {
    return Review.create(newReview)
};

exports.findByreviewId = function (reviewId) {
    return Review.findById(reviewId)
};

exports.editReview = function(reviewId, title, content, rating, noiseLevel){ // first parameter = primary key users shld input
    return Review.findByIdAndUpdate(reviewId, // primary key. this is the query object passed to updateOne. it tells mongoDB to find a review where _id=reviewId & userId=the logged-in user
        {
            title:title, 
            content:content, 
            rating:rating,
            ...(noiseLevel !== undefined && { noiseLevel:noiseLevel }) // the old EJS update form doesn't send it, so don't wipe it
        }
    )
};

exports.deleteReview = function (reviewId){
    return Review.findOneAndDelete({_id:reviewId})
};

