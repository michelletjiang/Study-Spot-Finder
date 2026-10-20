const Favourite = require('../models/favourites-model');
 
// READ MANY - show all favourites for the logged-in user
exports.showFavourites = async (req, res) => {
    try {
        const userName = req.session.user.username;
        const favourites = await Favourite.getAll(userName);
        res.render('favourites', { favourites });
    } catch (error) {
        console.error('Error loading favourites:', error);
        res.send('Error loading favourites');
    }
};
 
// CREATE - add a study spot to favourites (GET request, no redirect to favourites page)
exports.addFavourite = async (req, res) => {
    try {
        const userName       = req.session.user.username;
        const spotName       = req.query.spotName;
        const buildingName   = req.query.buildingName;
        const floor          = req.query.floor;
        const seatCount      = req.query.seatCount;
        const hasPowerSocket = req.query.hasPowerSocket === 'true';
        const noiseLevel     = req.query.noiseLevel;
 
        // prevent duplicates for this user
        const existing = await Favourite.findByUserAndSpotAndBuilding(userName, spotName, buildingName);
        if (!existing) {
            await Favourite.addFavourite({ userName, spotName, buildingName, floor, seatCount, hasPowerSocket, noiseLevel });
        }
 
        // go back to the building page instead of redirecting to favourites
        res.redirect('/building/' + buildingName);
    } catch (error) {
        console.error('Error adding favourite:', error);
        res.send('Error adding favourite');
    }
};
 
 
// DELETE - remove a favourite from the favourites page
exports.removeFavourite = async (req, res) => {
    try {
        const favId = req.query.favId;
        await Favourite.removeFavourite(favId);
        res.redirect('/favourites');
    } catch (error) {
        console.error('Error removing favourite:', error);
        res.redirect('/favourites');
    }
};
// ---------- JSON API (used by Vue) ----------

const mongoose = require('mongoose');
const StudySpot = require('../models/studyspot-model');

// GET /api/favourites
exports.apiListFavourites = async (req, res) => {
    try {
        res.json(await Favourite.getAll(req.session.user.username));
    } catch (error) {
        console.error('Error loading favourites:', error);
        res.status(500).json({ message: 'Error loading favourites' });
    }
};

// POST /api/favourites   body: { spotId }
// The spot details are copied from the database, not from the request like the old ?query link did
exports.apiAddFavourite = async (req, res) => {
    if (!mongoose.isValidObjectId(req.body.spotId)) return res.status(404).json({ message: 'Study spot not found' });
    try {
        const userName = req.session.user.username;
        const spot = await StudySpot.findById(req.body.spotId);
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });

        // prevent duplicates for this user - adding twice just returns the existing one
        const existing = await Favourite.findByUserAndSpotAndBuilding(userName, spot.name, spot.buildingName);
        if (existing) return res.json(existing);

        const favourite = await Favourite.addFavourite({
            userName,
            spotName:       spot.name,
            buildingName:   spot.buildingName,
            floor:          spot.floor,
            seatCount:      spot.seatCount,
            hasPowerSocket: spot.hasPowerSocket,
            noiseLevel:     spot.noiseLevel
        });
        res.status(201).json(favourite);
    } catch (error) {
        console.error('Error adding favourite:', error);
        res.status(500).json({ message: 'Error adding favourite' });
    }
};

// DELETE /api/favourites/:id   (only your own - the old link could remove anyone's)
exports.apiRemoveFavourite = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Favourite not found' });
    try {
        const result = await Favourite.removeFavouriteForUser(req.params.id, req.session.user.username);
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Favourite not found' });
        res.status(204).end();
    } catch (error) {
        console.error('Error removing favourite:', error);
        res.status(500).json({ message: 'Error removing favourite' });
    }
};
