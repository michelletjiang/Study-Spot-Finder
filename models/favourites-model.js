// ACTIVE: model for a student's saved spots. Used by controllers/favourites-controller.js.
const mongoose = require('mongoose');

// Schema: a favourite stores a copy of the spot's details instead of an id link.
const favouriteSchema = new mongoose.Schema({
    // The student who saved it, identified by username.
    userName:       { type: String, required: true },
    // Name of the saved spot.
    spotName:       { type: String, required: true },
    // Name of its building.
    buildingName:   { type: String, required: true },
    // Floor.
    floor:          { type: String, required: true },
    // Number of seats.
    seatCount:      { type: Number, required: true },
    // Whether the spot has power sockets.
    hasPowerSocket: { type: Boolean, default: false },
    // Noise level copied from the spot.
    noiseLevel:     { type: String, required: true }
// timestamps adds createdAt and updatedAt.
}, { timestamps: true });

// Register the model: name Favourite, collection "favourites".
const Favourite = mongoose.model('Favourite', favouriteSchema, 'favourites');

// Existing helpers follow. getAll returns one student's favourites.
// READ MANY - get all favourites for a specific user
exports.getAll = function(userName) {
    return Favourite.find({ userName: userName });
};

// Used before adding, so the same spot is not saved twice.
// used to check for duplicates before adding
exports.findByUserAndSpotAndBuilding = function(userName, spotName, buildingName) {
    return Favourite.findOne({ userName: userName, spotName: spotName, buildingName: buildingName });
};

// Save a new favourite.
// CREATE - add a new favourite
exports.addFavourite = function(newFavourite) {
    return Favourite.create(newFavourite);
};

// Delete by id. Does not check the owner, so only the legacy routes use it.
// DELETE - remove a favourite by its _id
exports.removeFavourite = function(favId) {
    return Favourite.deleteOne({ _id: favId });
};
// Delete by id and owner, so one student cannot remove another student's favourite. The JSON API uses this one.
// DELETE - remove a favourite only if it belongs to this user (used by the JSON API)
exports.removeFavouriteForUser = function(favId, userName) {
    return Favourite.deleteOne({ _id: favId, userName: userName });
};
