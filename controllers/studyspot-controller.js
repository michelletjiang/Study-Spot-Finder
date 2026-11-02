// MIXED file: lines 13 to 148 are LEGACY EJS handlers (render pages, used only by routes/studyspot-routes.js). Lines from "JSON API" onward are ACTIVE and used by routes/api/spots-routes.js.
// mongoose is used here only to test whether an id looks like a real ObjectId.
const mongoose = require('mongoose');
// StudySpot model: the database access for spots.
const StudySpot = require('../models/studyspot-model');
// Building model: used to check a spot's floor against the building's floor count.
const Building = require('../models/building-model');
const cascade = require('../services/cascade-service'); // deletes child records with their parent
// ACTIVE (comparison): validates the ?ids= value of a compare request. See lib/compare.js.
const { parseComparisonIds } = require('../lib/compare');

// Existing note below is out of date: the JSON versions of these handlers already exist in the "JSON API" section lower in this file. The EJS handlers above that section are the ones still waiting to be deleted.
// TODO(M2): convert every handler in this file to JSON:
//   res.render(view, data)      -> res.json(data)
//   res.send('not found')       -> res.status(404).json({ message })
//   res.send('Error ...')       -> res.status(500).json({ message })
//   res.redirect(...)           -> res.json(result) and let the Vue router navigate
//   showAddForm/showEditForm/showDeleteForm become unnecessary (Vue builds the forms)

// LEGACY - not used by the Vue demo: renders the old EJS list of all spots.
// showStudySpots displays all the study spots filtered by buildingName
// An async handler: await pauses until the database answers.
exports.showStudySpots = async (req, res) => {
    // const buildingname = req.query.buildingname; // get buildingName from url if provided
    // console.log(buildingname);
    try {
        // if (buildingname) {
        //     let studySpotList = await StudySpot.findByBuilding(buildingname); // fetch list of study spots in that building 
        //     res.render('studyspot-list', { studySpotList }); // Render the EJS form view and pass the posts
        // } else {
            // Fetch every spot from the database.
            let studySpotList = await StudySpot.retrieveAll();
            // Render views/studyspot-list.ejs with the spots.
            res.render('studyspot-list', { studySpotList });
        // Any database error is caught and reported as plain text.
        } catch (error) {
    console.error(error)
    res.send("Error reading database."); // Send error message if fetching fails
    }
};

// LEGACY - not used by the Vue demo: renders one spot's detail page.
// showSpotDetail displays the study spot selected
exports.showSpotDetail = async (req, res) => {
    // The spot id comes from the ?id= query string.
    const spotId = req.query.id; 
    console.log(spotId);
    try {
        // Look up the spot, then render views/studyspot-details.ejs.
        let result = await StudySpot.findById(spotId);
        res.render('studyspot-details', { result }); 
    // An invalid id also lands here and shows a plain-text message.
    } catch (error) {
        console.error(error);
        res.send('Study spot not found.');
    }
};

// LEGACY - not used by the Vue demo: shows the add-spot form with the list of buildings.
// showAddForm displays the add study spot form
exports.showAddForm = async (req, res) => {
    try {
        // The buildings fill the form's drop-down.
        const buildings = await Building.retrieveAll();
        res.render('add-studyspot', { buildings, result: '', msg: '' });
    } catch (error) {
        console.error(error);
        // A database error becomes a 500 response.
        res.status(500).send('Error fetching buildings');
    }
};

// LEGACY - not used by the Vue demo: handles the add-spot form post.
exports.createSpot = async (req, res) => {
    // Read the form fields from the request body.
    const { buildingName, name, floor, seatCount, noiseLevel } = req.body;
    // TODO(M2): JSON sends a real boolean, so use Boolean(req.body.hasPowerSocket) instead
    // Form checkboxes arrive as text, so turn "true" into a real boolean.
    const hasPowerSocket = req.body.hasPowerSocket === 'true' ? true : false;
    const buildingNameSearch = req.body.buildingName
    // Fetch buildings so the form can be shown again.
    const buildings = await Building.retrieveAll();
    // Find the chosen building to check the floor number against its floors.
    const building_data = await Building.findByName(buildingNameSearch)
    console.log(building_data)
    // TODO(M2): BUG - building_data is null for an unknown building, so building_data.floors below crashes.
    //           Add: if (!building_data) return res.status(404).json({ message: 'Building not found' })
    // Reject the form if any required field is empty.
    if (!buildingName || !name || !floor || !seatCount || !noiseLevel) {
        return res.render('add-studyspot', { buildings, result: '', msg: 'All fields are required.' })
    };
    // Reject floors that are not B1 or a number inside the building's range.
    if ( (isNaN(floor) && floor.toUpperCase() !== 'B1') || (!isNaN(floor) && (floor < 1 || floor > building_data.floors))) {
        return res.render('add-studyspot', { buildings, result: '', msg: 'Please enter valid floor'})
    };
    // Build the object to save.
    let newSpot = {
        buildingName:   buildingName,
        name:           name,
        floor:          floor,
        seatCount:      seatCount,
        hasPowerSocket: hasPowerSocket,
        noiseLevel:     noiseLevel
    };

    try {
        // Save it and render the form with the result.
        const result = await StudySpot.addSpot(newSpot);
        res.render('add-studyspot', { buildings, result, msg: '' });
    } catch (error) {
        console.error(error);
        // On failure show the form again with an error flag.
        res.render('add-studyspot', { buildings, result: 'fail', msg: '' });
    }
};

// LEGACY - not used by the Vue demo: shows the edit-spot form.
// showEditForm 
exports.showEditForm = async (req, res) => {
    // Spot id from the query string.
    const spotId = req.query.id
    try {
        // Load the spot to pre-fill the form.
        let result = await StudySpot.findById(spotId);
        res.render('edit-studyspot', { result });
    } catch (error) {
        // Existing weakness: on error nothing is sent back, so the request would hang. Left as is.
        console.error(error);
    }
};

// LEGACY - not used by the Vue demo: saves the edit-spot form.
// updateSpot 
exports.updateSpot = async (req, res) => {
    // The hidden form field holds the spot id.
    const spotId = req.body.id; // in the hidden field
    // Collect the edited values.
    const updatedData = {
        buildingName:   req.body.buildingName,
        name:           req.body.name,
        floor:          req.body.floor,
        seatCount:      req.body.seatCount,
        hasPowerSocket: req.body.hasPowerSocket === 'true' ? true : false,
        noiseLevel:     req.body.noiseLevel
    };

    try {
        // Write the changes to the database.
        let success = await StudySpot.editSpot(spotId, updatedData);
        console.log(success);
        // Go back to the old list page.
        res.redirect('/studyspot-list');
    } catch (error) {
        console.error(error);
        res.send('Failed to update study spot.')
    }
};

// LEGACY - not used by the Vue demo: confirmation page before deleting a spot.
// showDeleteForm
exports.showDeleteForm = async (req, res) => {
    const spotId = req.query.id;
    try {
        // Load the spot to show what will be deleted.
        let result = await StudySpot.findById(spotId);
        res.render('delete-studyspot', { result });
    } catch (error) {
        console.error(error);
        // On error render the page with a message.
        res.render('delete-studyspot', { result: null, msg: 'Failed to load study spot.'});
    }
};

// LEGACY - not used by the Vue demo: performs the delete.
// deleteSpot 
exports.deleteSpot = async (req, res) => {
    const spotId = req.body.id; // in the hidden field
    console.log(spotId);
    try {
        // Delete the spot by id.
        let success = await StudySpot.deleteSpot(spotId);
        console.log(success);
        // Only redirect when exactly one document was deleted.
        if (success.deletedCount === 1) {
            res.redirect('/studyspot-list');
        }
        // TODO(M2): BUG - if deletedCount is 0 no response is sent and the request hangs; return 404
    } catch (error) {
        console.error(error);
        res.send('Failed to delete study spot.')
    }
};

// ACTIVE: everything from here on is the JSON API used by the Vue client.
// ---------- JSON API (used by Vue) ----------

// The only noise levels the admin form may set.
const NOISE_LEVELS = ['Quiet', 'Moderate', 'Loud'];

// Checks admin input for a spot and returns an error message, or null when it is fine. Used by create and update.
// returns an error message, or null if the spot is valid for this building
function validateSpot({ name, floor, seatCount, noiseLevel }, building) {
    // Every field must be present (seatCount may be 0 only if provided, so it is compared with undefined and an empty string).
    if (!name?.trim() || !floor || seatCount === undefined || seatCount === '' || !noiseLevel)
        return 'All fields are required.';
    // Normalise the floor to upper case so "b1" becomes "B1".
    const f = String(floor).toUpperCase();
    // The floor must be B1 or a whole number from 1 up to the building's floors.
    if (f !== 'B1' && !(Number.isInteger(Number(f)) && f >= 1 && f <= building.floors))
        return `Floor must be B1 or 1-${building.floors}.`;
    // Seat count must be at least 1.
    if (!(Number(seatCount) >= 1)) return 'Seat count must be at least 1.';
    // Noise level must be one of the allowed values.
    if (!NOISE_LEVELS.includes(noiseLevel)) return 'Noise level must be Quiet, Moderate or Loud.';
    // null means no problem found.
    return null;
}

// GET /api/spots: all spots for the building page and other lists.
// GET /api/spots
exports.listSpots = async (req, res) => {
    try {
        // Send every spot as JSON.
        res.json(await StudySpot.retrieveAll());
    } catch (error) {
        console.error(error);
        // A database error becomes a JSON 500.
        res.status(500).json({ message: 'Error reading database' });
    }
};

// ACTIVE (comparison): GET /api/spots/compare?ids=id1,id2[,id3]. Mounted by routes/api/spots-routes.js behind auth.apiLoggedIn.
// GET /api/spots/compare?ids=id1,id2[,id3]
// The client only sends ids. The server reads the facts itself, so nobody can fake values.
// Comparison deliberately reads server-owned facts and never accepts client-supplied spot data.
// This handler is read-only: it never writes to the database.
exports.compareSpots = async (req, res) => {
    // Validate the ids with lib/compare.js.
    const { ids, valid } = parseComparisonIds(req.query.ids);
    // Wrong count, duplicates or invalid ids: answer 400 with a message (the compare view shows it).
    if (!valid) {
        // 400 means a bad request, and the cleaned id list is returned for debugging.
        return res.status(400).json({ message: 'Choose exactly two or three unique study spots.', ids });
    }
    try {
        // One database query for all the ids (models/studyspot-model.js findByIds).
        const spots = await StudySpot.findByIds(ids);
        // Index the results by id so we can look them up quickly.
        const byId = new Map(spots.map(spot => [String(spot._id), spot]));
        // Return the spots in the order the student chose, plus missingIds for ids that no longer exist (for example a deleted spot). Nothing is scored or ranked and no winner is chosen.
        res.json({ spots: ids.filter(id => byId.has(id)).map(id => byId.get(id)), missingIds: ids.filter(id => !byId.has(id)) });
    // Anything unexpected becomes a 500 response.
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading comparison data' });
    }
};

// GET /api/spots/:id: one spot for the detail page.
// GET /api/spots/:id
exports.getSpotJson = async (req, res) => {
    // A malformed id cannot exist, so answer 404 without asking the database.
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Study spot not found' });
    try {
        const spot = await StudySpot.findById(req.params.id);
        // No such spot: 404.
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });
        // Send the spot as JSON.
        res.json(spot);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// POST /api/spots (admin): create a spot.
// POST /api/spots
exports.createSpotJson = async (req, res) => {
    try {
        // The building must exist, because the floor limit comes from it.
        const building = await Building.findByName(req.body.buildingName);
        if (!building) return res.status(404).json({ message: 'Building not found' }); // the old createSpot crashed here
        // Validate the input with validateSpot.
        const msg = validateSpot(req.body, building);
        if (msg) return res.status(400).json({ message: msg });

        // Save the spot, with trimmed and normalised values.
        const spot = await StudySpot.addSpot({
            buildingName:   building.buildingname,
            name:           req.body.name.trim(),
            floor:          String(req.body.floor).toUpperCase(),
            seatCount:      Number(req.body.seatCount),
            // Existing note: JSON sends a real boolean for this field.
            hasPowerSocket: Boolean(req.body.hasPowerSocket), // JSON sends a real boolean now
            noiseLevel:     req.body.noiseLevel
        });
        // 201 means created.
        res.status(201).json(spot);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding study spot' });
    }
};

// PUT /api/spots/:id (admin): update a spot.
// PUT /api/spots/:id   (building can't change, same as the old edit form)
exports.updateSpotJson = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Study spot not found' });
    try {
        // Load the spot first.
        const spot = await StudySpot.findById(req.params.id);
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });
        // Look up its building for the floor check.
        const building = await Building.findByName(spot.buildingName);
        if (!building) return res.status(404).json({ message: 'Building not found' });
        const msg = validateSpot(req.body, building);
        if (msg) return res.status(400).json({ message: msg });

        // Write the new values. The building cannot be changed here.
        const updated = {
            name:           req.body.name.trim(),
            floor:          String(req.body.floor).toUpperCase(),
            seatCount:      Number(req.body.seatCount),
            hasPowerSocket: Boolean(req.body.hasPowerSocket),
            noiseLevel:     req.body.noiseLevel
        };
        await StudySpot.editSpot(spot._id, updated);
        // Reviews and favourites point at the spot by name, so carry the edit over to them.
        await cascade.syncSpotEdit(spot, updated);
        // Return the saved spot.
        res.json(await StudySpot.findById(spot._id));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating study spot' });
    }
};

// DELETE /api/spots/:id (admin): remove a spot.
// DELETE /api/spots/:id
exports.deleteSpotJson = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Study spot not found' });
    try {
        // Find it first: its name is needed to find the reviews and favourites that point at it.
        const spot = await StudySpot.findById(req.params.id);
        // Missing spot means it did not exist.
        if (!spot) return res.status(404).json({ message: 'Study spot not found' });
        // Delete the spot with its reviews, their reports and everyone's favourites of it.
        await cascade.deleteSpot(spot);
        // 204 means success with no body.
        res.status(204).end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting study spot' });
    }
};
