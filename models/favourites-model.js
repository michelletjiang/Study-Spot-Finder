const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema({
    userName:       { type: String, required: true },
    spotName:       { type: String, required: true },
    buildingName:   { type: String, required: true },
    floor:          { type: String, required: true },
    seatCount:      { type: Number, required: true },
    hasPowerSocket: { type: Boolean, default: false }
}, { timestamps: true });

const Favourite = mongoose.model('Favourite', favouriteSchema, 'favourites');

// READ MANY - get all favourites for a specific user
exports.getAll = function(userName) {
    return Favourite.find({ userName: userName });
};

// used to check for duplicates before adding
exports.findByUserAndSpotAndBuilding = function(userName, spotName, buildingName) {
    return Favourite.findOne({ userName: userName, spotName: spotName, buildingName: buildingName });
};

// CREATE - add a new favourite
exports.addFavourite = function(newFavourite) {
    return Favourite.create(newFavourite);
};

// DELETE - remove a favourite by its _id
exports.removeFavourite = function(favId) {
    return Favourite.deleteOne({ _id: favId });
};
// DELETE - remove a favourite only if it belongs to this user (used by the JSON API)
exports.removeFavouriteForUser = function(favId, userName) {
    return Favourite.deleteOne({ _id: favId, userName: userName });
};
