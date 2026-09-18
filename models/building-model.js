const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
    buildingname: {
        type: String,
        required: [true, 'A building must have a name']
        
    },
    floors: {
        type: Number,
        required: [true, 'A building must have floors'],
    },
    postal: {
        type: Number,
        required: [true, 'A building must have a postal code'],
        unique: true
    }
},{
    timestamps: true
  });

const Building = mongoose.model('Building', buildingSchema,'building');


exports.retrieveAll = function() {

  return Building.find();
};

exports.findByPostal = function(postal) {
  return Building.findOne({ postal:postal });
};
exports.findByName = function(name){
  return Building.findOne({buildingname:name})
}
exports.addBuilding = function(newBuilding) {
  return Building.create(newBuilding);
};

exports.editBuilding = function(postal,floors) {
  return Building.updateOne({postal:postal} ,{floors:floors});
};

exports.deleteBuilding = function(postal) {
  return Building.deleteOne({postal:postal});
};


