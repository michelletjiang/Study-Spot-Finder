// Adds dummy noise reports for the heatmap: Connexion level 4 and every floor of LKCSB, SOA, YPHSL and SOSS/CIS.
// Reports only count for an hour (services/noise-service.js), so re-run this to refresh them.
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

// Connexion: spot name -> its reports as [status, minutes ago]. Rooms not listed stay striped (no reports).
const connexReports = {
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

// The other buildings have too many rooms to list, so their rooms take turns through these patterns
// (sorted by name, so re-running gives the same result). null = no reports, so the room stays striped.
const PATTERNS = [
  [['Quiet', 6], ['Quiet', 18]],
  [['Moderate', 9], ['Quiet', 22]],
  null,
  [['Loud', 4], ['Moderate', 16]],
  [['Quiet', 12]],
  null,
  [['Moderate', 7], ['Moderate', 20], ['Loud', 26]],
  [['Loud', 3], ['Loud', 14]],
  null,
];
const PATTERN_BUILDINGS = [
  'Lee Kong Chian School of Business',
  'School of Accountancy',
  'Yong Pung How School of Law',
  'School of Social Sciences / College of Integrative Studies',
];

const toDocs = (spot, spotReports) => spotReports.map(([status, minutesAgo]) => {
  const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);
  return { spot: spot._id, userId: DUMMY_USER_ID, status, createdAt, updatedAt: createdAt };
});

async function main() {
  await mongoose.connect(process.env.DB);

  const removed = await NoiseReport.deleteMany({ userId: DUMMY_USER_ID });
  console.log(`Removed ${removed.deletedCount} old dummy reports.`);
  if (process.argv.includes('--remove')) return;

  const docs = [];
  const connex = await StudySpot.findByBuilding('CONNEX');
  for (const [name, spotReports] of Object.entries(connexReports)) {
    const spot = connex.find(s => s.name === name);
    if (spot) docs.push(...toDocs(spot, spotReports));
    else console.log(`  - CONNEX ${name}: study spot not found, skipped`);
  }
  console.log(`CONNEX: ${docs.length} reports`);

  for (const building of PATTERN_BUILDINGS) {
    const spots = (await StudySpot.findByBuilding(building)).sort((a, b) => a.name.localeCompare(b.name));
    const before = docs.length;
    spots.forEach((spot, i) => {
      const pattern = PATTERNS[i % PATTERNS.length];
      if (pattern) docs.push(...toDocs(spot, pattern));
    });
    console.log(`${building}: ${docs.length - before} reports across ${spots.length} spots`);
  }

  await NoiseReport.insertMany(docs);
  console.log(`Added ${docs.length} dummy reports. They expire within the hour.`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
