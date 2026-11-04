// JSON API for buildings, used by routes/api/buildings-routes.js.
const { checkLevels } = require('../lib/floors');

// Models and services this controller calls.
// Get Service model
// Building model: reads and writes the buildings collection.
const Building = require('../models/building-model');
const cascade = require('../services/cascade-service'); // deletes child records with their parent
// StudySpot model: used to list the spots inside a building.
const StudySpot = require('../models/studyspot-model'); // add this at the top with the other requires
// Review summaries give each spot its average rating on the building page.
const Review = require('../models/reviews-model');
// OneMap service: finds the coordinates of a new building's postal code.
const onemap = require('../services/onemap');

// ACTIVE: JSON API used by the Vue client.
// ---------- JSON API (used by Vue) ----------

// Checks the admin form for a new building. Returns an error message or null.
// shared validation for create
function validateBuilding({ buildingname, postal, floors, basements }) {
    // Name, postal code and floors are all required.
    if (!buildingname?.trim() || !postal || !floors) return 'All Fields Are Required.';
    // The postal code is exactly six digits.
    if (!/^\d{6}$/.test(String(postal))) return 'Enter Valid Postal Code.';
    // Floors are from 1 to 10 and basement levels 0 to 2 (lib/floors.js).
    return checkLevels({ floors, basements });
}

// GET /api/buildings: list buildings for the home page (HomeView.vue).
// GET /api/buildings
exports.listBuildings = async (req, res) => {
    try {
        // Send all buildings as JSON.
        res.json(await Building.retrieveAll());
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/buildings/:postal: one building.
// GET /api/buildings/:postal
exports.getBuildingJson = async (req, res) => {
    try {
        // Look it up by postal code.
        const building = await Building.findByPostal(req.params.postal);
        // Nothing found: 404.
        if (!building) return res.status(404).json({ message: 'Building not found' });
        res.json(building);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/buildings/:buildingname/spots: the building and its spots (BuildingSpotsView.vue, where the Compare buttons are).
// GET /api/buildings/:buildingname/spots
exports.listBuildingSpots = async (req, res) => {
    try {
        // Find the building by name.
        const building = await Building.findByName(req.params.buildingname);
        if (!building) return res.status(404).json({ message: 'Building not found' });
        // Find its spots, and the review summary of every reviewed spot.
        const [spots, summaries] = await Promise.all([StudySpot.findByBuilding(building.buildingname), Review.summariseAll()]);
        // Reviews are stored by building name + spot name (roomId), so match them the same way.
        const reviews = new Map(summaries
            .filter(r => r._id.buildingName === building.buildingname)
            .map(r => [r._id.roomId, r]));
        // Each spot gets avgRating (1-5, null = no reviews yet) and reviewCount, for the floor plan colours.
        const studySpots = spots.map(spot => ({
            ...spot.toObject(),
            avgRating: reviews.get(spot.name)?.avgRating ?? null,
            reviewCount: reviews.get(spot.name)?.count ?? 0,
        }));
        // Send both together.
        res.json({ building, studySpots });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error loading study spots' });
    }
};

// POST /api/buildings (admin): create a building.
// POST /api/buildings
exports.createBuildingJson = async (req, res) => {
    // Validate the body.
    const msg = validateBuilding(req.body);
    if (msg) return res.status(400).json({ message: msg });

    // Pull out the fields.
    const { buildingname, postal, floors, basements = 0 } = req.body;
    try {
        // Existing note: a failed OneMap lookup does not stop the save.
        // look up lat/lng from OneMap; if that fails the building is still saved
        // without them and `npm run geocode` can fill them in later
        let coords = null;
        try {
            // This calls OneMap, which the demo blocks, so a demo-created building has no coordinates.
            coords = await onemap.geocodePostal(postal);
        } catch (error) {
            console.error('Geocode failed for postal ' + postal + ':', error.message);
        }
        // Save the building; the coordinates are added when found.
        const building = await Building.addBuilding({ buildingname: buildingname.trim(), postal, floors, basements: Number(basements), ...coords });
        res.status(201).json(building);
    } catch (error) {
        // Duplicate postal code: 409 conflict.
        if (error.code === 11000) return res.status(409).json({ message: 'Postal Code Exist Already.' });
        console.error(error);
        res.status(500).json({ message: 'Error adding building' });
    }
};

// PUT /api/buildings/:postal (admin): only the floors and basement levels can change.
// PUT /api/buildings/:postal  body: { floors, basements? }
exports.updateBuildingJson = async (req, res) => {
    const { floors, basements } = req.body;
    // Floors must be 1 to 10 and basement levels 0 to 2 (lib/floors.js).
    const msg = checkLevels({ floors, basements: basements ?? 0 });
    if (msg) return res.status(400).json({ message: msg });
    try {
        // Update the floors, and the basements if they were sent.
        const result = await Building.editBuilding(req.params.postal, Number(floors), basements === undefined ? undefined : Number(basements));
        // No match means no such building.
        if (result.matchedCount === 0) return res.status(404).json({ message: 'Building not found' });
        // Return the updated building.
        res.json(await Building.findByPostal(req.params.postal));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating building' });
    }
};

// DELETE /api/buildings/:postal (admin).
// DELETE /api/buildings/:postal
exports.deleteBuildingJson = async (req, res) => {
    try {
        // Find it first: its name links it to its spots, reviews and favourites.
        const building = await Building.findByPostal(req.params.postal);
        // Missing building: 404.
        if (!building) return res.status(404).json({ message: 'Building not found' });
        // Remove the building with its spots, their reviews and reports, and favourites.
        await cascade.deleteBuilding(building);
        // 204 means success with no body.
        res.status(204).end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting building' });
    }
};
