// MIXED file: lines 10 to 168 are LEGACY EJS handlers used only by routes/buildings-routes.js. The "JSON API" section from line 171 is ACTIVE and used by routes/api/buildings-routes.js.
// fs/promises is imported but not used in this file.
const { checkLevels } = require('../lib/floors');
const fs = require('fs/promises');

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



// LEGACY - not used by the Vue demo: shows the empty add-building EJS form.
exports.showAddForm = async (req, res) => {
    let result= "";
    let msg=""
     res.render("add-building", {result, msg}); 
 
};

// LEGACY - not used by the Vue demo: handles the add-building form.
exports.createBuilding = async (req, res) => {
  // Read the fields from the form body.
  const buildingname = req.body.buildingname;
  const postal = req.body.postal;
  const floors = req.body.floors;
 
  
  //do some form validation here
  // Reject the form if a field is blank.
  if (!buildingname.trim() || !postal.trim() || !floors.trim()) {
     let result="";
     let msg="All Fields Are Required."
      res.render("add-building", {result,msg}); 
     return;
  } 
 // A postal code must be 6 digits.
 if (postal.length !== 6 || isNaN(postal)) {
     let result="";
     let msg="Enter Valid Postal Code."
      res.render("add-building", {result,msg}); 
     return;
  } 

// Floors must be a whole number from 1 to 10 (as text).
if (!['1','2','3','4','5','6','7','8','9','10'].includes(floors)) {
     let result="";
     let msg="Enter Valid Floor."
      res.render("add-building", {result,msg}); 
     return;
};
  // Build the object to save.
  let newBuilding = {
    buildingname: buildingname,
    floors: floors,
    postal: postal,
  };
  try {
    let msg="";
    // Save the building.
    let result= await Building.addBuilding(newBuilding);
    console.log("mylog:" +result);
     // Render the form again with the saved building.
     res.render("add-building", {result:result ||null, msg}); 

  // A duplicate postal code is database error code 11000.
  } catch (error) {
    console.error(error);
    let result="fail";
    let msg= error.code === 11000 ? "Postal Code Exist Already." : "";
    res.render("add-building", {result,msg});

  }
};


// LEGACY - not used by the Vue demo: lists buildings so an admin can edit one.
exports.showBuildingList = async (req, res) => {
  try {
    // Fetch all buildings.
    let buildings = await Building.retrieveAll(); 
    
    // Render views/edit-building.ejs.
    res.render("edit-building", { buildings });
  } catch (error) {
    console.error(error);
    res.send("Error reading database"); // Send error message if fetching fails
  }
};


// LEGACY - not used by the Vue demo: shows the update form for one building.
exports.getBuilding = async (req, res) => {
  // The postal code comes from the query string.
  const postal = req.query.postal; 
  console.log(postal);

  try {
    // Look the building up by postal code.
    let result= await Building.findByPostal(postal);
 
    // Render views/update-building.ejs.
    res.render("update-building", {result:result ||null}); 
  } catch (error) {
    // Existing weakness: on error nothing is sent back, so the request would hang.
    console.error(error);
   
  }
};


// LEGACY - not used by the Vue demo: saves the new number of floors.
exports.updateBuilding = async (req, res) => {
  const postal= req.body.postal;
  const newfloors = req.body.floors; 
  
  try {
    
    // Update the floors in the database.
    let success= await Building.editBuilding (postal,newfloors);
    console.log(success); 
    // Reply with a small inline HTML page.
    res.send(`
      <p>Building has been successfully updated.</p>
      <br>
      <a href="/edit-buildings">Back to All Buildings</a>
    `);
  } catch (error) {
    console.error(error);
   
  }
};


// LEGACY - not used by the Vue demo: shows the delete confirmation page.
exports.getMarkedBuilding = async (req, res) => {
  const postal = req.query.postal; 
  console.log(postal);

  try {
    let result= await Building.findByPostal(postal);
 
    res.render("delete-building", {result:result ||null}); 
  } catch (error) {
    console.error(error);
   
  }
};


// LEGACY - not used by the Vue demo: deletes a building after confirmation.
exports.deleteABuilding = async (req, res) => {
  const postal= req.body.postal; 
  console.log(postal);
  try {
    // Delete by postal code.
    let success= await Building.deleteBuilding(postal);

    console.log(success); 
    
    // Only answer when exactly one building was removed.
    if (success.deletedCount === 1) {
    res.send(`
    <p>Building has been successfully deleted.</p>   
    <br>
    <a href="/edit-buildings">Back to All Buildings</a>
    `);
}
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding building');
  }
};

// LEGACY - not used by the Vue demo: old home page listing buildings.
exports.showHome = async (req, res) => {
    try {
        // Fetch all buildings.
        const buildings = await Building.retrieveAll();
        // Existing quirk: no let, const or var here, so user becomes an implicit global variable.
        user = req.session.user
        // Render views/home.ejs.
        res.render('home', { buildings, user});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading home page');
    }
};

// LEGACY - not used by the Vue demo: old page listing the spots in one building.
exports.showBuildingSpots = async (req, res) => {
    const buildingname = req.params.buildingname;
    try {
        // Fetch the spots of that building.
        const studySpots = await StudySpot.findByBuilding(buildingname);
        // Render views/building-spots.ejs.
        res.render('building-spots', { buildingname, studySpots });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading study spots');
    }
};


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
