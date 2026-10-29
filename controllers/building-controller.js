const fs = require('fs/promises');

// Get Service model
const Building = require('../models/building-model');
const StudySpot = require('../models/studyspot-model'); // add this at the top with the other requires
const onemap = require('../services/onemap');



exports.showAddForm = async (req, res) => {
    let result= "";
    let msg=""
     res.render("add-building", {result, msg}); 
 
};

exports.createBuilding = async (req, res) => {
  const buildingname = req.body.buildingname;
  const postal = req.body.postal;
  const floors = req.body.floors;
 
  
  //do some form validation here
  if (!buildingname.trim() || !postal.trim() || !floors.trim()) {
     let result="";
     let msg="All Fields Are Required."
      res.render("add-building", {result,msg}); 
     return;
  } 
 if (postal.length !== 6 || isNaN(postal)) {
     let result="";
     let msg="Enter Valid Postal Code."
      res.render("add-building", {result,msg}); 
     return;
  } 

if (!['1','2','3','4','5','6','7','8','9','10'].includes(floors)) {
     let result="";
     let msg="Enter Valid Floor."
      res.render("add-building", {result,msg}); 
     return;
};
  let newBuilding = {
    buildingname: buildingname,
    floors: floors,
    postal: postal,
  };
  try {
    let msg="";
    let result= await Building.addBuilding(newBuilding);
    console.log("mylog:" +result);
     res.render("add-building", {result:result ||null, msg}); 

  } catch (error) {
    console.error(error);
    let result="fail";
    let msg= error.code === 11000 ? "Postal Code Exist Already." : "";
    res.render("add-building", {result,msg});

  }
};


exports.showBuildingList = async (req, res) => {
  try {
    let buildings = await Building.retrieveAll(); 
    
    res.render("edit-building", { buildings });
  } catch (error) {
    console.error(error);
    res.send("Error reading database"); // Send error message if fetching fails
  }
};


exports.getBuilding = async (req, res) => {
  const postal = req.query.postal; 
  console.log(postal);

  try {
    let result= await Building.findByPostal(postal);
 
    res.render("update-building", {result:result ||null}); 
  } catch (error) {
    console.error(error);
   
  }
};


exports.updateBuilding = async (req, res) => {
  const postal= req.body.postal;
  const newfloors = req.body.floors; 
  
  try {
    
    let success= await Building.editBuilding (postal,newfloors);
    console.log(success); 
    res.send(`
      <p>Building has been successfully updated.</p>
      <br>
      <a href="/edit-buildings">Back to All Buildings</a>
    `);
  } catch (error) {
    console.error(error);
   
  }
};


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


exports.deleteABuilding = async (req, res) => {
  const postal= req.body.postal; 
  console.log(postal);
  try {
    let success= await Building.deleteBuilding(postal);

    console.log(success); 
    
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

exports.showHome = async (req, res) => {
    try {
        const buildings = await Building.retrieveAll();
        user = req.session.user
        res.render('home', { buildings, user});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading home page');
    }
};

exports.showBuildingSpots = async (req, res) => {
    const buildingname = req.params.buildingname;
    try {
        const studySpots = await StudySpot.findByBuilding(buildingname);
        res.render('building-spots', { buildingname, studySpots });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading study spots');
    }
};


// ---------- JSON API (used by Vue) ----------

// shared validation for create
function validateBuilding({ buildingname, postal, floors }) {
    if (!buildingname?.trim() || !postal || !floors) return 'All Fields Are Required.';
    if (!/^\d{6}$/.test(String(postal))) return 'Enter Valid Postal Code.';
    if (!(Number(floors) >= 1 && Number(floors) <= 10)) return 'Enter Valid Floor.';
    return null;
}

// GET /api/buildings
exports.listBuildings = async (req, res) => {
    try {
        res.json(await Building.retrieveAll());
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/buildings/:postal
exports.getBuildingJson = async (req, res) => {
    try {
        const building = await Building.findByPostal(req.params.postal);
        if (!building) return res.status(404).json({ message: 'Building not found' });
        res.json(building);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};

// GET /api/buildings/:buildingname/spots
exports.listBuildingSpots = async (req, res) => {
    try {
        const building = await Building.findByName(req.params.buildingname);
        if (!building) return res.status(404).json({ message: 'Building not found' });
        const studySpots = await StudySpot.findByBuilding(building.buildingname);
        res.json({ building, studySpots });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error loading study spots' });
    }
};

// POST /api/buildings
exports.createBuildingJson = async (req, res) => {
    const msg = validateBuilding(req.body);
    if (msg) return res.status(400).json({ message: msg });

    const { buildingname, postal, floors } = req.body;
    try {
        // look up lat/lng from OneMap; if that fails the building is still saved
        // without them and `npm run geocode` can fill them in later
        let coords = null;
        try {
            coords = await onemap.geocodePostal(postal);
        } catch (error) {
            console.error('Geocode failed for postal ' + postal + ':', error.message);
        }
        const building = await Building.addBuilding({ buildingname: buildingname.trim(), postal, floors, ...coords });
        res.status(201).json(building);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'Postal Code Exist Already.' });
        console.error(error);
        res.status(500).json({ message: 'Error adding building' });
    }
};

// PUT /api/buildings/:postal  (only floors can change, same as the old form)
exports.updateBuildingJson = async (req, res) => {
    const floors = Number(req.body.floors);
    if (!(floors >= 1 && floors <= 10)) return res.status(400).json({ message: 'Enter Valid Floor.' });
    try {
        const result = await Building.editBuilding(req.params.postal, floors);
        if (result.matchedCount === 0) return res.status(404).json({ message: 'Building not found' });
        res.json(await Building.findByPostal(req.params.postal));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating building' });
    }
};

// DELETE /api/buildings/:postal
exports.deleteBuildingJson = async (req, res) => {
    try {
        const result = await Building.deleteBuilding(req.params.postal);
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Building not found' });
        res.status(204).end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting building' });
    }
};
