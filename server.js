const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');
const session = require('express-session');
dotenv.config({ path: './config.env' });

const userRoutes = require('./routes/user-routes');
const buildingsRoutes = require('./routes/buildings-routes');
const studySpotRoutes = require('./routes/studyspot-routes');
const reviewsRoute = require('./routes/reviews-route')
const reportRoutes = require('./routes/report-routes');
const adminRequestRoutes = require('./routes/admin-request-routes');
const favRoutes = require('./routes/favourites-routes');
const apiRoutes = require('./routes/api');


const server = express();
// trust the AWS load balancer so secure cookies work behind it
server.set('trust proxy', 1)

// make sure u add this line when you are using Express to do form (POST)
server.use(express.urlencoded({ extended: true }));

// express.json() is a middleware
server.use(express.json());
server.use(express.static('public'));



// Set EJS as the view engine for rendering dynamic HTML pages
// TODO(M6): delete this line (and the ejs package + views/) at cut-over
server.set("view engine", "ejs");

server.use(session({
  secret: process.env.SECRET, //sign the session ID cookie. should be a long, random, and secure string, preferably stored in an environment variable
  resave: false, // Prevents the session from being saved back to the session store if nothing has changed.
  saveUninitialized: false // Prevents a new, empty session from being saved to the store.
  // TODO(M1): add store: MongoStore.create({ mongoUrl: process.env.DB }) (npm i connect-mongo)
  //           so logins survive a server restart (default MemoryStore loses them)
  // TODO(M1): add cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }
}));

// JSON API for the Vue client, mounted BEFORE the old EJS routes
server.get('/api/health', (req, res) => res.json({ ok: true }));
server.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));
server.use('/api', apiRoutes);  // new routes/api/*.js files, one per feature

// root routes
// TODO(M6): remove these old EJS routes once every page has a Vue view
server.use('/', userRoutes);
server.use('/', buildingsRoutes);
server.use('/', studySpotRoutes);
server.use('/', reviewsRoute);
server.use('/', reportRoutes);
server.use('/', adminRequestRoutes);
server.use('/', favRoutes);

// TODO(M6): serve the built Vue app in production, AFTER all /api routes:
//   server.use(express.static(path.join(__dirname, 'client/dist')));
//   server.get('/{*splat}', (req, res) => res.sendFile(path.join(__dirname, 'client/dist/index.html')));

// Specify the path to the environment variablef file 'config.env'

// async function to connect to DB
async function connectDB() {
  try {
    // connecting to Database with our config.env file and DB is constant in config.env
    await mongoose.connect(process.env.DB);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

function startServer() {
  // 0.0.0.0 and process.env.PORT are needed on AWS
  const hostname = "0.0.0.0"; // Define server hostname
  const port = process.env.PORT || 8000; // Define port number
 
  // Start the server and listen on the specified hostname and port
  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
}

// call connectDB first and when connection is ready we start the web server
connectDB().then(startServer);


