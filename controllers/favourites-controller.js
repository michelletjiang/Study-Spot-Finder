// JSON API for saved spots, used by routes/api/favourites-routes.js.
// The favourites model reads and writes saved spots.
const Favourite = require('../models/favourites-model');

// ACTIVE: JSON API used by the Vue client (client/src/stores/favourites.js and FavouriteButton.vue).
// ---------- JSON API (used by Vue) ----------

// Used to check that an id is well formed.
const mongoose = require('mongoose');
// Spot model, to copy the spot's details into the favourite.
const StudySpot = require('../models/studyspot-model');

// GET /api/favourites: the logged-in user's saved spots.
// GET /api/favourites
exports.apiListFavourites = async (req, res) => {
    try {
        // Look up favourites by username and send them.
        res.json(await Favourite.getAll(req.session.user.username));
    } catch (error) {
        console.error('Error loading favourites:', error);
        res.status(500).json({ message: 'Error loading favourites' });
    }
};

// POST /api/favourites with a body like { spotId }.
// POST /api/favourites   body: { spotId }
// The spot details are copied from the database, not from the request like the old ?query link did
exports.apiAddFavourite = async (req, res) => {
    // A malformed id means there is no such spot: 404.
    if (!mongoose.isValidObjectId(req.body.spotId)) return res.status(404).json({ message: 'Study spot not found' });
    try {
        const userName = req.session.user.username;
        // Read the spot from the database.
        const spot = await StudySpot.findById(req.body.spotId);
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });

        // prevent duplicates for this user - adding twice just returns the existing one
        // Adding the same spot again returns the existing favourite.
        const existing = await Favourite.findByUserAndSpotAndBuilding(userName, spot.name, spot.buildingName);
        if (existing) return res.json(existing);

        // Save a copy of the spot's details.
        const favourite = await Favourite.addFavourite({
            userName,
            spotName:       spot.name,
            buildingName:   spot.buildingName,
            floor:          spot.floor,
            seatCount:      spot.seatCount,
            hasPowerSocket: spot.hasPowerSocket,
            noiseLevel:     spot.noiseLevel
        });
        // 201 means created.
        res.status(201).json(favourite);
    } catch (error) {
        console.error('Error adding favourite:', error);
        res.status(500).json({ message: 'Error adding favourite' });
    }
};

// DELETE /api/favourites/:id: remove one of your own favourites.
// DELETE /api/favourites/:id   (only your own - the old link could remove anyone's)
exports.apiRemoveFavourite = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Favourite not found' });
    try {
        // Only deletes if the favourite belongs to this user.
        const result = await Favourite.removeFavouriteForUser(req.params.id, req.session.user.username);
        // Nothing deleted: 404.
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Favourite not found' });
        // 204 means success with no body.
        res.status(204).end();
    } catch (error) {
        console.error('Error removing favourite:', error);
        res.status(500).json({ message: 'Error removing favourite' });
    }
};
