// JSON API for study spots, used by routes/api/spots-routes.js.
// mongoose is used here only to test whether an id looks like a real ObjectId.
const { isFloorOf, floorRange } = require('../lib/floors');
const mongoose = require('mongoose');
// StudySpot model: the database access for spots.
const StudySpot = require('../models/studyspot-model');
// Building model: used to check a spot's floor against the building's floor count.
const Building = require('../models/building-model');
const cascade = require('../services/cascade-service'); // deletes child records with their parent
// ACTIVE (comparison): validates the ?ids= value of a compare request. See lib/compare.js.
const { parseComparisonIds } = require('../lib/compare');

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
    // The floor must be one of the building's: a basement it has (B1, B2) or 1 up to its floors (lib/floors.js).
    if (!isFloorOf(floor, building)) return `Floor must be ${floorRange(building)}.`;
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
