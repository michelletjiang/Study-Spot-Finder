// Fills in lat/lng for buildings that don't have them yet, using OneMap search on the postal code.
// Usage: npm run geocode          (only buildings missing coordinates)
//        npm run geocode -- --all (re-geocode every building)
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const Building = require('../models/building-model');
const onemap = require('../services/onemap');

// OneMap allows ~250 requests a minute, so pause a little between calls
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  await mongoose.connect(process.env.DB);

  const all = process.argv.includes('--all');
  const buildings = all ? await Building.retrieveAll() : await Building.findMissingCoordinates();
  console.log(`Geocoding ${buildings.length} building(s)...`);

  let failed = 0;
  for (const b of buildings) {
    try {
      const coords = await onemap.geocodePostal(b.postal);
      if (!coords) {
        failed++;
        console.log(`  ✗ ${b.buildingname} (${b.postal}): no OneMap result`);
        continue;
      }
      await Building.setCoordinates(b.postal, coords.lat, coords.lng);
      console.log(`  ✓ ${b.buildingname} (${b.postal}): ${coords.lat}, ${coords.lng}`);
    } catch (error) {
      failed++;
      console.log(`  ✗ ${b.buildingname} (${b.postal}): ${error.message}`);
    }
    await sleep(300);
  }

  console.log(`Done. ${buildings.length - failed} updated, ${failed} failed.`);
  await mongoose.disconnect();
  if (failed) process.exitCode = 1;
}

main().catch(async error => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
