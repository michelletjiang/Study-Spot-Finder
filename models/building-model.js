const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
    buildingname: {
        type: String,
        required: [true, 'A building must have a name']
        
    },
    floors: {
        type: Number,
        required: [true, 'A building must have floors'],
    },
    postal: {
        type: Number,
        required: [true, 'A building must have a postal code'],
        unique: true
    },
    // filled from OneMap using the postal code (on create, or by `npm run geocode` for old buildings)
    // needed for the map, walk times (M3) and the heatmap (M5b)
    lat: Number,
    lng: Number
},{
    timestamps: true
  });

const Building = mongoose.model('Building', buildingSchema,'building');


exports.retrieveAll = function() {

  return Building.find();
};

exports.findByPostal = function(postal) {
  return Building.findOne({ postal:postal });
};
exports.findByName = function(name){
  return Building.findOne({buildingname:name})
}
exports.addBuilding = function(newBuilding) {
  return Building.create(newBuilding);
};

exports.editBuilding = function(postal,floors) {
  return Building.updateOne({postal:postal} ,{floors:floors});
};

exports.setCoordinates = function(postal, lat, lng) {
  return Building.updateOne({postal:postal}, {lat:lat, lng:lng});
};

exports.findMissingCoordinates = function() {
  return Building.find({ $or: [{lat:null}, {lng:null}] });
};

exports.deleteBuilding = function(postal) {
  return Building.deleteOne({postal:postal});
};


