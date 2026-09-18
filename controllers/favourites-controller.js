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