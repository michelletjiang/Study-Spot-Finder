// One-off: sets each building's basement levels from the study spots it already has (a spot on B2 means 2 basements).
// Buildings saved before basements existed have none, so their B1/B2 spots couldn't be edited until this runs.
// Usage: npm run set:basements             (show what would change)
//        npm run set:basements -- --save   (save it)
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const Building = require('../models/building-model');
const StudySpot = require('../models/studyspot-model');
const { MAX_BASEMENTS } = require('../lib/floors');

async function main() {
  await mongoose.connect(process.env.DB);
  const save = process.argv.includes('--save');

  for (const building of await Building.retrieveAll()) {
    const spots = await StudySpot.findByBuilding(building.buildingname);
    // the deepest basement any spot is on: "B2" -> 2
    const deepest = Math.max(0, ...spots.map(s => Number(/^\s*B(\d+)\s*$/i.exec(String(s.floor))?.[1] || 0)));
    const basements = Math.min(deepest, MAX_BASEMENTS);
    if (basements === (building.basements || 0)) continue;
    console.log(`${building.buildingname}: ${building.basements || 0} -> ${basements} basement level(s)`);
    if (save) await Building.editBuilding(building.postal, building.floors, basements);
  }
  console.log(save ? 'Saved.' : 'Nothing saved. Run again with -- --save to save.');
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
