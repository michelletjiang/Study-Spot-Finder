// Task-private synthetic preview fixture. Loaded with node -r before server.js.
// It never connects to MongoDB, never reads real credentials and blocks all outbound HTTP.
// All data below is made up. Changes (favourites, reviews) live in memory and vanish on restart.

// 1. Synthetic settings first. dotenv does not override values that already exist, so config.env cannot replace them.
process.env.DB = 'mongodb://synthetic.invalid/none';
process.env.SECRET = 'synthetic-preview-session-secret';
process.env.ONEMAP_EMAIL = 'synthetic@local.test';
process.env.ONEMAP_PASSWORD = 'synthetic-not-real';

const mongoose = require(process.cwd() + '/node_modules/mongoose');
const bcrypt = require(process.cwd() + '/node_modules/bcrypt');

// 2. Never connect, and never wait for a connection: any unstubbed database call fails at once.
mongoose.set('bufferCommands', false);
mongoose.connect = async () => mongoose;

// 3. Block every outbound request from the backend (OneMap login, search, routing).
globalThis.fetch = async () => { throw new Error('Outbound requests are blocked in the synthetic preview'); };

const User = require(process.cwd() + '/models/user-model');
const AdminRequest = require(process.cwd() + '/models/admin-request-model');
const Building = require(process.cwd() + '/models/building-model');
const StudySpot = require(process.cwd() + '/models/studyspot-model');
const Favourite = require(process.cwd() + '/models/favourites-model');
const Review = require(process.cwd() + '/models/reviews-model');
const Report = require(process.cwd() + '/models/reports');

const user = {
  _id: '507f1f77bcf86cd799439001',
  username: 'demo.student',
  email: 'demo.student@local.test',
  password: bcrypt.hashSync('CompareDemo123!', 4),
  school: ['SCIS'],
  role: 'Student',
  createdAt: new Date('2026-10-23T00:00:00Z'),
};

const admin = {
  _id: '507f1f77bcf86cd799439002',
  username: 'demo.admin',
  email: 'demo.admin@local.test',
  password: bcrypt.hashSync('AdminDemo123!', 4),
  school: ['SCIS'],
  role: 'Admin',
  createdAt: new Date('2026-10-23T00:00:00Z'),
};

const users = [user, admin];

const building = { _id: '507f1f77bcf86cd799439010', buildingname: 'Demo Library', floors: 5, postal: 188065 };

const spots = [
  { _id: '507f1f77bcf86cd799439011', buildingName: 'Demo Library', name: 'Window Tables', floor: '2', seatCount: 18, hasPowerSocket: true, noiseLevel: 'Quiet' },
  { _id: '507f1f77bcf86cd799439012', buildingName: 'Demo Library', name: 'Project Booths', floor: '3', seatCount: 8, hasPowerSocket: true, noiseLevel: 'Moderate' },
  { _id: '507f1f77bcf86cd799439013', buildingName: 'Demo Library', name: 'Open Commons', floor: '1', seatCount: 42, hasPowerSocket: false, noiseLevel: 'Loud' },
  { _id: '507f1f77bcf86cd799439014', buildingName: 'Demo Library', name: 'Silent Corner', floor: '4', seatCount: 6, hasPowerSocket: true, noiseLevel: 'Quiet' },
];

// In-memory stores for the few things a student can change.
let favourites = [];
let reviews = [
  { _id: '507f1f77bcf86cd799439021', buildingName: 'Demo Library', roomId: 'Window Tables', userId: 'demo.student', title: 'Bright and calm', content: 'Synthetic review for the preview.', rating: 5, createdAt: new Date('2026-10-24T00:00:00Z') },
];
let nextId = 0x100;
// 24 hex characters, so the app's ObjectId checks accept the made-up ids.
const newId = () => '507f1f77bcf86cd799439' + (nextId++).toString(16).padStart(3, '0');

// A value that can be awaited or chained with .sort(), like a Mongoose query.
const query = value => ({ sort: async () => value, then: (ok, fail) => Promise.resolve(value).then(ok, fail) });

User.findOne = async q => users.find(candidate => q.email === candidate.email || q.username === candidate.username) || null;
User.findById = async id => users.find(candidate => String(id) === candidate._id) || null;
// Hash newly registered demo passwords so the synthetic flow matches production login behavior.
User.create = async data => {
  const created = { _id: newId(), createdAt: new Date(), ...data };
  if (created.password && !created.password.startsWith('$2')) created.password = bcrypt.hashSync(created.password, 4);
  users.push(created);
  return created;
};
AdminRequest.findOne = () => query(null);
AdminRequest.find = () => query([]);
Report.find = () => query([]);

Building.retrieveAll = async () => [building];
Building.findByName = async name => (name === building.buildingname ? building : null);
Building.findByPostal = async postal => (String(postal) === String(building.postal) ? building : null);

StudySpot.retrieveAll = async () => spots;
StudySpot.findByBuilding = async name => (name === building.buildingname ? spots : []);
StudySpot.findById = async id => spots.find(spot => String(spot._id) === String(id)) || null;
StudySpot.findByIds = async ids => spots.filter(spot => ids.includes(String(spot._id)));

Favourite.getAll = async () => favourites;
Favourite.findByUserAndSpotAndBuilding = async (u, spotName, buildingName) => favourites.find(f => f.spotName === spotName && f.buildingName === buildingName) || null;
Favourite.addFavourite = async data => { const fav = { _id: newId(), ...data }; favourites.push(fav); return fav; };
Favourite.removeFavouriteForUser = async id => { const before = favourites.length; favourites = favourites.filter(f => f._id !== id); return { deletedCount: before - favourites.length }; };

Review.findByRoom = (buildingName, roomId) => query(reviews.filter(r => r.buildingName === buildingName && r.roomId === roomId));
Review.findbyUser = userId => query(reviews.filter(r => r.userId === userId));
Review.findByreviewId = async id => reviews.find(r => String(r._id) === String(id)) || null;
Review.addReview = async data => { const review = { _id: newId(), createdAt: new Date(), ...data }; reviews.push(review); return review; };
Review.editReview = async (id, title, content, rating) => { const r = reviews.find(x => String(x._id) === String(id)); if (r) Object.assign(r, { title, content, rating }); return r; };
Review.deleteReview = async id => { reviews = reviews.filter(r => String(r._id) !== String(id)); return {}; };

process.on('SIGTERM', () => process.exit(0));
