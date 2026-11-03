// ACTIVE: model for campus buildings. Used by controllers/building-controller.js and scripts/geocode-buildings.js.
const mongoose = require('mongoose');

// Schema: the fields every building document has.
const buildingSchema = new mongoose.Schema({
    // The building name, which spots refer to through their buildingName field.
    buildingname: {
        type: String,
        required: [true, 'A building must have a name']
        
    },
    // Number of floors above ground (1 to 10).
    floors: {
        type: Number,
        required: [true, 'A building must have floors'],
    },
    // Basement levels (0 to 2): B1, B2. Older buildings saved before this field have none until an admin sets it.
    basements: {
        type: Number,
        default: 0,
        min: 0,
        max: 2,
    },
    // Postal code. It is unique, so it also acts as the id in the URLs (/api/buildings/:postal).
    postal: {
        type: Number,
        required: [true, 'A building must have a postal code'],
        unique: true
    },
    // filled from OneMap using the postal code (on create, or by `npm run geocode` for old buildings)
    // needed for the map, walk times (M3) and the heatmap (M5b)
    // Existing note below: lat and lng feed MiniMap.vue. In the demo the fixture has no coordinates, so no route is drawn.
    lat: Number,
    lng: Number
// timestamps adds createdAt and updatedAt.
},{
    timestamps: true
  });

// Register the model: model name Building, collection "building".
const Building = mongoose.model('Building', buildingSchema,'building');


// Unlike most models in this repo, this file exports plain functions instead of the model object.
// Each function returns a query the controller can await.
exports.retrieveAll = function() {

  // All buildings.
  return Building.find();
};

// One building by postal code.
exports.findByPostal = function(postal) {
  return Building.findOne({ postal:postal });
};
// One building by name.
exports.findByName = function(name){
  return Building.findOne({buildingname:name})
}
// Create a building.
exports.addBuilding = function(newBuilding) {
  return Building.create(newBuilding);
};

// Change the number of floors of the building with that postal code (and its basement levels, when given).
exports.editBuilding = function(postal, floors, basements) {
  return Building.updateOne({ postal: postal }, basements === undefined ? { floors } : { floors, basements });
};

// Save latitude and longitude. Used by the geocode script.
exports.setCoordinates = function(postal, lat, lng) {
  return Building.updateOne({postal:postal}, {lat:lat, lng:lng});
};

// Buildings that still lack coordinates (lat or lng is null).
exports.findMissingCoordinates = function() {
  return Building.find({ $or: [{lat:null}, {lng:null}] });
};

// Delete a building by postal code.
exports.deleteBuilding = function(postal) {
  return Building.deleteOne({postal:postal});
};


