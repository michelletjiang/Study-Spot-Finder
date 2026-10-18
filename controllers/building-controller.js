const fs = require('fs/promises');

// Get Service model
const Building = require('../models/building-model');
const StudySpot = require('../models/studyspot-model'); // add this at the top with the other requires
const Review = require('../models/reviews-model');
const Report = require('../models/reports');
const Favourite = require('../models/favourites-model');



// a building must have 1-10 floors; used by both create and update
function validFloors(floors) {
  return ['1','2','3','4','5','6','7','8','9','10'].includes(String(floors).trim());
}

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

if (!validFloors(floors)) {
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

  if (!validFloors(newfloors)) {
    let result = await Building.findByPostal(postal);
    return res.render("update-building", {result: result || null, msg: "Enter Valid Floor."});
  }

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
    const building = await Building.findByPostal(postal);
    if (!building) {
      return res.send(`
      <p>Building not found.</p>
      <br>
      <a href="/edit-buildings">Back to All Buildings</a>
      `);
    }

    // clear the children first so nothing is left pointing at a dead building
    const reviews = await Review.findByBuilding(building.buildingname);
    await Report.deleteByReviews(reviews.map(r => r._id));
    await Review.deleteByBuilding(building.buildingname);
    await Favourite.deleteByBuilding(building.buildingname);
    await StudySpot.deleteByBuilding(building.buildingname);

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
