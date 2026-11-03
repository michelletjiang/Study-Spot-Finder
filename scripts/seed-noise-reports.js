// Adds dummy noise reports for the heatmap on Connexion level 4.
// Reports only count for 30 minutes (services/noise-service.js), so re-run this to refresh them.
// Every dummy report has the same made-up userId, so re-running replaces them and real reports are never touched.
// Usage: npm run seed:noise             (add or refresh)
//        npm run seed:noise -- --remove (delete them all)
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const StudySpot = require('../models/studyspot-model');
const NoiseReport = require('../models/noise-report-model');

const DUMMY_USER_ID = new mongoose.Types.ObjectId('000000000000000000c20bd5');
const BUILDING = 'CONNEX';

// spot name -> its reports as [status, minutes ago]. Rooms not listed stay striped (no reports).
const reports = {
  'Collaboration Zone (Level 4)': [['Moderate', 5], ['Loud', 15], ['Moderate', 25]],
  'Study Booth 4-1': [['Quiet', 10]],
  'Study Booth 4-2': [['Quiet', 15], ['Quiet', 22]],
  'Study Booth 4-4': [['Quiet', 20], ['Moderate', 27]],
  'Study Booth 4-5': [['Moderate', 8]],
  'Study Booth 4-8': [['Moderate', 12], ['Loud', 24]],
  'Meeting Pod 4-1': [['Moderate', 12]],
  'Meeting Pod 4-2': [['Loud', 6], ['Moderate', 20]],
  'Meeting Pod 4-4': [['Loud', 3], ['Loud', 18]],
  'Meeting Pod 4-6': [['Quiet', 25], ['Loud', 5]],
  'Meeting Lounge 4-1': [['Moderate', 15], ['Quiet', 26]],
  'Active Learning Classroom 4-1': [['Loud', 2], ['Loud', 10], ['Moderate', 21]],
  'Active Learning Classroom 4-2': [['Quiet', 25]],
};

async function main() {
  await mongoose.connect(process.env.DB);

  const removed = await NoiseReport.deleteMany({ userId: DUMMY_USER_ID });
  console.log(`Removed ${removed.deletedCount} old dummy reports.`);
  if (process.argv.includes('--remove')) return;

  const spots = await StudySpot.findByBuilding(BUILDING);
  const docs = [];
  for (const [name, spotReports] of Object.entries(reports)) {
    const spot = spots.find(s => s.name === name);
    if (!spot) {
      console.log(`  - ${name}: study spot not found, skipped`);
      continue;
    }
    for (const [status, minutesAgo] of spotReports) {
      const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);
      docs.push({ spot: spot._id, userId: DUMMY_USER_ID, status, createdAt, updatedAt: createdAt });
    }
  }

  await NoiseReport.insertMany(docs);
  console.log(`Added ${docs.length} dummy reports across ${Object.keys(reports).length} rooms. They expire in 30 minutes or less.`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
