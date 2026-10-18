const Favourite = require('../models/favourites-model');
const StudySpot = require('../models/studyspot-model');
 
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
 
// CREATE - add a study spot to favourites
exports.addFavourite = async (req, res) => {
    try {
        const userName       = req.session.user.username;
        const spot = await StudySpot.findById(req.body.spotId);
        if (!spot) {
            return res.render('error', { message: 'Study spot not found' });
        }

        const spotName       = spot.name;
        const buildingName   = spot.buildingName;
        const floor          = spot.floor;
        const seatCount      = spot.seatCount;
        const hasPowerSocket = spot.hasPowerSocket;
        const noiseLevel     = spot.noiseLevel;
 
        // prevent duplicates for this user
        const existing = await Favourite.findByUserAndSpotAndBuilding(userName, spotName, buildingName);
        if (!existing) {
            await Favourite.addFavourite({ userName, spotName, buildingName, floor, seatCount, hasPowerSocket, noiseLevel });
        }
 
        // go back to the building page instead of redirecting to favourites
        res.redirect('/building/' + encodeURIComponent(buildingName));
    } catch (error) {
        console.error('Error adding favourite:', error);
        res.send('Error adding favourite');
    }
};
 
 
// DELETE - remove a favourite from the favourites page
exports.removeFavourite = async (req, res) => {
    try {
        const favId = req.body.favId;
        await Favourite.removeFavourite(favId);
        res.redirect('/favourites');
    } catch (error) {
        console.error('Error removing favourite:', error);
        res.redirect('/favourites');
    }
};
