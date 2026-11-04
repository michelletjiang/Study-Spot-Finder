// ACTIVE: model for study spots. This is where the comparison feature gets its data: findByIds below feeds GET /api/spots/compare.
const mongoose = require('mongoose');

// Schema: the fields every study spot has.
// Create new 'studyspot' schema 
const studySpotSchema = new mongoose.Schema({
    // The building the spot is in. The building list page matches on this name.
    buildingName: {
        type: String,
        required: [true, 'A study spot must belong to a building']
    },
    // The spot's name.
    name: {
        type: String,
        required: [true, 'A study spot must have a name']
    },
    // Floor, kept as text (for example "Level 2").
    floor: {
        type: String,
        required: [true, 'A study spot must have a floor number']
    },
     // Seat count, used as a row in the comparison view.
     seatCount: {
        type: Number,
        required: [true, 'A study spot must have a seat count']
    },
    // Power sockets or not (defaults to no), also a comparison row.
    hasPowerSocket: {
        type: Boolean,
        default: false
    },
    // Noise level "Quiet", "Moderate" or "Loud". An admin sets the starting value; after that every noise rating from a
    // checked-in student replaces it with the average of the last hour's ratings (controllers/noise-controller.js).
    // It keeps the last value when the ratings expire, so it's how loud the spot was when last rated.
    noiseLevel: {
        type: String,
        enum: ['Quiet','Moderate','Loud'],
        required: [true, 'A study spot must have a noise level']
    },
    // Optional image filename (not required).
    image: {
        type: String,
        // required: [true, 'A study spot must have an image filename']
    }
},
// timestamps adds createdAt and updatedAt.
{
    timestamps: true
  });

// Register the model: name StudySpot, collection "studyspot".
const StudySpot = mongoose.model('StudySpot', studySpotSchema, 'studyspot');

// Functions exported for the controller.
// Methods

// All spots.
exports.retrieveAll = function(){
    return StudySpot.find();
};

// One spot by id.
exports.findById = function(id){
    return StudySpot.findById(id);
};

// Used by compareSpots in the controller.
// One database query fetches every requested spot, so there is no query per spot.
// One bounded query for comparison, preserving the caller's order in the controller.
// The select below returns only the fields the comparison needs.
// Project only the catalogue facts exposed by the comparison API.
// $in matches any of the ids in the list. The database does not keep the order, so the controller puts them back in the requested order.
exports.findByIds = function(ids){
    return StudySpot.find({ _id: { $in: ids } })
        .select('_id name buildingName floor seatCount hasPowerSocket noiseLevel')
        // lean() returns plain objects, which are lighter and are sent straight to the browser as JSON.
        .lean();
};

// All spots in one building (building page).
exports.findByBuilding = function(building){
    return StudySpot.find({ buildingName: building})
};

// Create a spot (admin).
exports.addSpot = function(newSpot) {
    return StudySpot.create(newSpot);
};

// Update a spot by id (admin).
exports.editSpot = function(id, updatedData) {
    return StudySpot.updateOne({ _id: id }, updatedData);
};

// Delete a spot by id (admin).
exports.deleteSpot = function(id) {
    return StudySpot.deleteOne({ _id: id });
};

// Cascade helper: remove every spot in a building.
exports.deleteByBuilding = function(buildingName) {
    return StudySpot.deleteMany({ buildingName: buildingName });
};
