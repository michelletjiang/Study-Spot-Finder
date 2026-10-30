// Adds the Li Ka Shing Library study spots that the floorplans (client/src/floorplans.js) link to.
// Safe to re-run: spots that already exist (same building + name) are skipped.
// Usage: npm run seed:lks
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const Building = require('../models/building-model');
const StudySpot = require('../models/studyspot-model');

const BUILDING = 'Li Ka Shing Library';

// seat counts are estimates from the floorplans (6 seats drawn in each project room) - admins can edit them later.
// Names must be unique in the building (reviews are matched by building + spot name), so areas that share a label
// on the plan ("Learning Commons", "Quiet Area", "Study Space", "Carrels & Study Space") get their position added.
const spots = [
  // level 2
  { floor: '2', name: 'RM2-0', seatCount: 6, hasPowerSocket: true },
  { floor: '2', name: 'RM2-1', seatCount: 6, hasPowerSocket: true },
  { floor: '2', name: 'RM2-2', seatCount: 6, hasPowerSocket: true },
  { floor: '2', name: 'RM2-3', seatCount: 6, hasPowerSocket: true },
  { floor: '2', name: 'RM2-4', seatCount: 6, hasPowerSocket: true },
  { floor: '2', name: 'RM2-5', seatCount: 6, hasPowerSocket: true },
  { floor: '2', name: 'Learning Commons (West)',  seatCount: 40, hasPowerSocket: true },
  { floor: '2', name: 'Learning Commons (East)',  seatCount: 30, hasPowerSocket: true },
  { floor: '2', name: 'Learning Commons (South)', seatCount: 40, hasPowerSocket: true },
  { floor: '2', name: 'Quiet Area (North)',       seatCount: 40, hasPowerSocket: true },
  { floor: '2', name: 'Quiet Area (East)',        seatCount: 30, hasPowerSocket: true },
  // level 3
  { floor: '3', name: 'RM3-1', seatCount: 6, hasPowerSocket: true },
  { floor: '3', name: 'RM3-2', seatCount: 6, hasPowerSocket: true },
  { floor: '3', name: 'RM3-3', seatCount: 6, hasPowerSocket: true },
  { floor: '3', name: 'RM3-4', seatCount: 6, hasPowerSocket: true },
  { floor: '3', name: 'RM3-5', seatCount: 6, hasPowerSocket: true },
  { floor: '3', name: 'Study Space (West)', seatCount: 60, hasPowerSocket: true },
  { floor: '3', name: 'Study Space (East)', seatCount: 50, hasPowerSocket: true },
  // level 4 (the plan has no RM4-3 or RM4-17)
  { floor: '4', name: 'RM4-1', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-2', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-4', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-5', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-6', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-7', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-8', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-9', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-10', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-11', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-12', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-13', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-14', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-15', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-16', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'RM4-18', seatCount: 6, hasPowerSocket: true },
  { floor: '4', name: 'Carrels & Study Space (North)',      seatCount: 40, hasPowerSocket: true },
  { floor: '4', name: 'Carrels & Study Space (North-East)', seatCount: 60, hasPowerSocket: true },
  { floor: '4', name: 'Carrels & Study Space (East)',       seatCount: 20, hasPowerSocket: true },
  { floor: '4', name: 'Study Space (Level 4 West)',         seatCount: 80, hasPowerSocket: true },
  { floor: '4', name: 'Study Space (Level 4 South-East)',   seatCount: 30, hasPowerSocket: true },
  // level 5
  { floor: '5', name: 'RM5-1', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'RM5-2', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'RM5-3', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'RM5-4', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'RM5-5', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'RM5-6', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'RM5-7', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'RM5-8', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'RM5-9', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'RM5-10', seatCount: 6, hasPowerSocket: true },
  { floor: '5', name: 'Quiet Area', seatCount: 60, hasPowerSocket: true },
  { floor: '5', name: 'Learning Labs', seatCount: 40, hasPowerSocket: true },
];

async function main() {
  await mongoose.connect(process.env.DB);

  if (!(await Building.findByName(BUILDING))) throw new Error(`Building "${BUILDING}" not found - add it first`);

  const existing = new Map((await StudySpot.findByBuilding(BUILDING)).map(s => [s.name, s]));
  let added = 0;
  for (const spot of spots) {
    const found = existing.get(spot.name);
    if (found) {
      // same name on another floor means two spots would share reviews - rename one of them
      const clash = String(found.floor) !== spot.floor ? ` - WARNING: that name is already used on floor ${found.floor}` : '';
      console.log(`  - ${spot.name}: already exists, skipped${clash}`);
      continue;
    }
    await StudySpot.addSpot({ buildingName: BUILDING, ...spot });
    added++;
    console.log(`  ✓ ${spot.name}`);
  }
  console.log(`Done. ${added} added, ${spots.length - added} skipped.`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
