// TOOL, NOT RUN BY THE DEMO: a manual script (npm run geocode). It connects to MongoDB, writes building coordinates and calls OneMap, so it must never be run against shared data in this preview.
// Fills in lat/lng for buildings that don't have them yet, using OneMap search on the postal code.
// Usage: npm run geocode          (only buildings missing coordinates)
//        npm run geocode -- --all (re-geocode every building)
// path builds the location of config.env no matter where the script is started.
const path = require('path');
// dotenv loads settings from config.env into process.env.
const dotenv = require('dotenv');
// mongoose is the MongoDB library the models use.
const mongoose = require('mongoose');
// Load the settings (DB address, OneMap login) without printing them.
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

// The Building model reads and updates the buildings collection.
const Building = require('../models/building-model');
// The OneMap service looks up coordinates from a postal code.
const onemap = require('../services/onemap');

// OneMap allows ~250 requests a minute, so pause a little between calls
// Wait helper: returns a promise that resolves after ms milliseconds.
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Entry function that does all the work.
async function main() {
  // Connect to the database named in the environment.
  await mongoose.connect(process.env.DB);

  // --all means redo every building, otherwise only buildings with no coordinates.
  const all = process.argv.includes('--all');
  // Choose which buildings to process: all of them, or just the ones missing coordinates.
  const buildings = all ? await Building.retrieveAll() : await Building.findMissingCoordinates();
  console.log(`Geocoding ${buildings.length} building(s)...`);

  // Count of buildings OneMap could not find.
  let failed = 0;
  // Handle the buildings one at a time to stay inside OneMap's rate limit.
  for (const b of buildings) {
    try {
      // Ask OneMap for the latitude and longitude of the postal code.
      const coords = await onemap.geocodePostal(b.postal);
      // No match: count it as failed, report it and skip to the next building.
      if (!coords) {
        failed++;
        console.log(`  ✗ ${b.buildingname} (${b.postal}): no OneMap result`);
        continue;
      }
      // Save the coordinates on the building document (a database write).
      await Building.setCoordinates(b.postal, coords.lat, coords.lng);
      console.log(`  ✓ ${b.buildingname} (${b.postal}): ${coords.lat}, ${coords.lng}`);
    // Any error from OneMap or the database counts as a failure for this building only.
    } catch (error) {
      failed++;
      console.log(`  ✗ ${b.buildingname} (${b.postal}): ${error.message}`);
    }
    // Pause 300 ms between calls.
    await sleep(300);
  }

  // Final summary line.
  console.log(`Done. ${buildings.length - failed} updated, ${failed} failed.`);
  // Close the database connection.
  await mongoose.disconnect();
  // A non-zero exit code tells the shell that something failed.
  if (failed) process.exitCode = 1;
}

// Run main and treat any unexpected error as fatal: report, disconnect and exit with code 1.
main().catch(async error => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
