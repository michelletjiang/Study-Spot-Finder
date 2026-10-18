const StudySpot = require('../models/studyspot-model');
const Building = require('../models/building-model');
const Review = require('../models/reviews-model');
const Report = require('../models/reports');
const Favourite = require('../models/favourites-model');

// showStudySpots displays all the study spots filtered by buildingName
exports.showStudySpots = async (req, res) => {
    // const buildingname = req.query.buildingname; // get buildingName from url if provided
    // console.log(buildingname);
    try {
        // if (buildingname) {
        //     let studySpotList = await StudySpot.findByBuilding(buildingname); // fetch list of study spots in that building 
        //     res.render('studyspot-list', { studySpotList }); // Render the EJS form view and pass the posts
        // } else {
            let studySpotList = await StudySpot.retrieveAll();
            res.render('studyspot-list', { studySpotList });
        } catch (error) {
    console.error(error)
    res.send("Error reading database."); // Send error message if fetching fails
    }
};

// showSpotDetail displays the study spot selected
exports.showSpotDetail = async (req, res) => {
    const spotId = req.query.id; 
    console.log(spotId);
    try {
        let result = await StudySpot.findById(spotId);
        res.render('studyspot-details', { result }); 
    } catch (error) {
        console.error(error);
        res.send('Study spot not found.');
    }
};

// showAddForm displays the add study spot form
exports.showAddForm = async (req, res) => {
    try {
        const buildings = await Building.retrieveAll();
        res.render('add-studyspot', { buildings, result: '', msg: '' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching buildings');
    }
};

exports.createSpot = async (req, res) => {
    const { buildingName, name, floor, seatCount, noiseLevel } = req.body;
    const hasPowerSocket = req.body.hasPowerSocket === 'true' ? true : false;
    const buildingNameSearch = req.body.buildingName
    const buildings = await Building.retrieveAll();
    const building_data = await Building.findByName(buildingNameSearch)
    console.log(building_data)
    if (!buildingName || !name || !floor || !seatCount || !noiseLevel) {
        return res.render('add-studyspot', { buildings, result: '', msg: 'All fields are required.' })
    };
    if (!building_data) {
        return res.render('add-studyspot', { buildings, result: '', msg: 'That building does not exist.' })
    };
    if ( (isNaN(floor) && floor.toUpperCase() !== 'B1') || (!isNaN(floor) && (floor < 1 || floor > building_data.floors))) {
        return res.render('add-studyspot', { buildings, result: '', msg: 'Please enter valid floor'})
    };
    let newSpot = {
        buildingName:   buildingName,
        name:           name,
        floor:          floor,
        seatCount:      seatCount,
        hasPowerSocket: hasPowerSocket,
        noiseLevel:     noiseLevel
    };

    try {
        const result = await StudySpot.addSpot(newSpot);
        res.render('add-studyspot', { buildings, result, msg: '' });
    } catch (error) {
        console.error(error);
        res.render('add-studyspot', { buildings, result: 'fail', msg: '' });
    }
};

// showEditForm 
exports.showEditForm = async (req, res) => {
    const spotId = req.query.id
    try {
        let result = await StudySpot.findById(spotId);
        res.render('edit-studyspot', { result });
    } catch (error) {
        console.error(error);
    }
};

// updateSpot 
exports.updateSpot = async (req, res) => {
    const spotId = req.body.id; // in the hidden field
    const updatedData = {
        buildingName:   req.body.buildingName,
        name:           req.body.name,
        floor:          req.body.floor,
        seatCount:      req.body.seatCount,
        hasPowerSocket: req.body.hasPowerSocket === 'true' ? true : false,
        noiseLevel:     req.body.noiseLevel
    };

    try {
        let success = await StudySpot.editSpot(spotId, updatedData);
        console.log(success);
        res.redirect('/studyspot-list');
    } catch (error) {
        console.error(error);
        res.send('Failed to update study spot.')
    }
};

// showDeleteForm
exports.showDeleteForm = async (req, res) => {
    const spotId = req.query.id;
    try {
        let result = await StudySpot.findById(spotId);
        res.render('delete-studyspot', { result });
    } catch (error) {
        console.error(error);
        res.render('delete-studyspot', { result: null, msg: 'Failed to load study spot.'});
    }
};

// deleteSpot 
exports.deleteSpot = async (req, res) => {
    const spotId = req.body.id; // in the hidden field
    console.log(spotId);
    try {
        const spot = await StudySpot.findById(spotId);
        if (!spot) {
            return res.send('Study spot not found.');
        }

        // clear the children first so no review or favourite is left orphaned
        const reviews = await Review.findByRoom(spot.buildingName, spot.name);
        await Report.deleteByReviews(reviews.map(r => r._id));
        await Review.deleteByRoom(spot.buildingName, spot.name);
        await Favourite.deleteBySpot(spot.buildingName, spot.name);

        let success = await StudySpot.deleteSpot(spotId);
        console.log(success);
        if (success.deletedCount === 1) {
            res.redirect('/studyspot-list');
        }
    } catch (error) {
        console.error(error);
        res.send('Failed to delete study spot.')
    }
};