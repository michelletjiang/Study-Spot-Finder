// Adds the Li Ka Shing Library level 2 study spots that the floorplan (client/src/floorplans.js) links to.
// Safe to re-run: spots that already exist (same building + name) are skipped.
// Usage: npm run seed:lks
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const Building = require('../models/building-model');
const StudySpot = require('../models/studyspot-model');

const BUILDING = 'Li Ka Shing Library';

// seat counts are estimates from the floorplan (6 seats drawn in each project room) - admins can edit them later
const spots = [
  { name: 'RM2-0', seatCount: 6, hasPowerSocket: true },
  { name: 'RM2-1', seatCount: 6, hasPowerSocket: true },
  { name: 'RM2-2', seatCount: 6, hasPowerSocket: true },
  { name: 'RM2-3', seatCount: 6, hasPowerSocket: true },
  { name: 'RM2-4', seatCount: 6, hasPowerSocket: true },
  { name: 'RM2-5', seatCount: 6, hasPowerSocket: true },
  // the plan has 3 "Learning Commons" and 2 "Quiet Area"s, and reviews are matched by building + spot name, so each needs its own name
  { name: 'Learning Commons (West)',  seatCount: 40, hasPowerSocket: true },
  { name: 'Learning Commons (East)',  seatCount: 30, hasPowerSocket: true },
  { name: 'Learning Commons (South)', seatCount: 40, hasPowerSocket: true },
  { name: 'Quiet Area (North)',       seatCount: 40, hasPowerSocket: true },
  { name: 'Quiet Area (East)',        seatCount: 30, hasPowerSocket: true },
];

async function main() {
  await mongoose.connect(process.env.DB);

  if (!(await Building.findByName(BUILDING))) throw new Error(`Building "${BUILDING}" not found - add it first`);

  const existing = new Set((await StudySpot.findByBuilding(BUILDING)).map(s => s.name));
  let added = 0;
  for (const spot of spots) {
    if (existing.has(spot.name)) {
      console.log(`  - ${spot.name}: already exists, skipped`);
      continue;
    }
    await StudySpot.addSpot({ buildingName: BUILDING, floor: '2', ...spot });
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
