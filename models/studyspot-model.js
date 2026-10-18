const mongoose = require('mongoose');

// Create new 'studyspot' schema 
const studySpotSchema = new mongoose.Schema({
    buildingName: {
        type: String,
        required: [true, 'A study spot must belong to a building']
    },
    name: {
        type: String,
        required: [true, 'A study spot must have a name']
    },
    floor: {
        type: String,
        required: [true, 'A study spot must have a floor number']
    },
     seatCount: {
        type: Number,
        required: [true, 'A study spot must have a seat count']
    },
    hasPowerSocket: {
        type: Boolean,
        default: false
    },
    noiseLevel: {
        type: String,
        required: [true, 'A study spot must have a noise level']
    },
    image: {
        type: String,
        // required: [true, 'A study spot must have an image filename']
    }
},
{
    timestamps: true
  });

const StudySpot = mongoose.model('StudySpot', studySpotSchema, 'studyspot');

// Methods

exports.retrieveAll = function(){
    return StudySpot.find();
};

exports.findById = function(id){
    return StudySpot.findById(id);
};

exports.findByBuilding = function(building){
    return StudySpot.find({ buildingName: building})
};

exports.addSpot = function(newSpot) {
    return StudySpot.create(newSpot);
};

exports.editSpot = function(id, updatedData) {
    return StudySpot.updateOne({ _id: id }, updatedData);
};

exports.deleteSpot = function(id) {
    return StudySpot.deleteOne({ _id: id });
};

// used when a building is deleted
exports.deleteByBuilding = function(buildingName) {
    return StudySpot.deleteMany({ buildingName: buildingName });
};
