// ACTIVE (mixed file): app entry point. Starts the Express server that the Vue client talks to through /api.
// Express is the web framework: it routes each HTTP request to a handler function.
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
// fs is imported here but not used anywhere else in this file.
const fs = require('fs');
// express-session keeps a logged-in user's data on the server and links it to the browser by a cookie.
const session = require('express-session');
// Load the settings (DB address, session secret, port) from config.env into process.env. Values are never printed here.
dotenv.config({ path: './config.env' });

// LEGACY - not used by the Vue demo: the next seven route files render old EJS pages (views/*.ejs). They stay mounted until the team's TODO(M6) cut-over.
// routes/api (loaded on the last line of this block) is the ACTIVE route tree used by the Vue client.
const userRoutes = require('./routes/user-routes');
const buildingsRoutes = require('./routes/buildings-routes');
const studySpotRoutes = require('./routes/studyspot-routes');
const reviewsRoute = require('./routes/reviews-route')
const reportRoutes = require('./routes/report-routes');
const adminRequestRoutes = require('./routes/admin-request-routes');
const favRoutes = require('./routes/favourites-routes');
// ACTIVE: routes/api/index.js collects every JSON route (auth, spots, reviews, compare and so on).
const apiRoutes = require('./routes/api');


// Create the one Express app object. Every use() and get() below attaches to it.
const server = express();
// trust the AWS load balancer so secure cookies work behind it
server.set('trust proxy', 1)
// Added note: 1 means trust one proxy hop, so req.protocol and secure cookies are right behind a load balancer.

// make sure u add this line when you are using Express to do form (POST)
// Parse HTML form posts into req.body. Only the legacy EJS forms send this format.
server.use(express.urlencoded({ extended: true }));

// express.json() is a middleware
// Parse JSON request bodies into req.body. The Vue client sends JSON through client/src/api.js.
server.use(express.json());
// Serve files from public/ as-is. Only the legacy EJS pages use public/styles.css.
server.use(express.static('public'));



// Set EJS as the view engine for rendering dynamic HTML pages
// TODO(M6): delete this line (and the ejs package + views/) at cut-over
// LEGACY - not used by the Vue demo: tells res.render() to look for .ejs files in views/. The Vue app never calls res.render.
server.set("view engine", "ejs");

// Sessions must be set up before any route that reads req.session (auth, compare, favourites).
server.use(session({
  // The secret signs the session cookie so it cannot be forged. It is read from the environment, never written in code.
  secret: process.env.SECRET, //sign the session ID cookie. should be a long, random, and secure string, preferably stored in an environment variable
  resave: false, // Prevents the session from being saved back to the session store if nothing has changed.
  saveUninitialized: false // Prevents a new, empty session from being saved to the store.
  // Current behaviour: no store is configured, so sessions live in server memory and are lost at every restart. The TODO(M1) notes below describe future work, not what runs today.
  // TODO(M1): add store: MongoStore.create({ mongoUrl: process.env.DB }) (npm i connect-mongo)
  //           so logins survive a server restart (default MemoryStore loses them)
  // TODO(M1): add cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }
}));

// JSON API for the Vue client, mounted BEFORE the old EJS routes
// ACTIVE: simple liveness check. The Vue client and the demo scripts use it to see that the server is up.
server.get('/api/health', (req, res) => res.json({ ok: true }));
// ACTIVE: tells the Vue client who is logged in (or null). client/src/stores/auth.js calls this on page load.
server.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));
// ACTIVE: every /api/... request is handed to routes/api/index.js. This is mounted before the legacy routes so /api paths are never caught by them.
server.use('/api', apiRoutes);  // new routes/api/*.js files, one per feature

// root routes
// TODO(M6): remove these old EJS routes once every page has a Vue view
// LEGACY - not used by the Vue demo: the seven mounts below serve old server-rendered pages from the root path. Vite only proxies /api, so the demo never reaches them.
server.use('/', userRoutes);
server.use('/', buildingsRoutes);
server.use('/', studySpotRoutes);
server.use('/', reviewsRoute);
server.use('/', reportRoutes);
server.use('/', adminRequestRoutes);
server.use('/', favRoutes);

// TODO(M6): serve the built Vue app in production, AFTER all /api routes:
// Current behaviour: Express does not yet serve the built Vue app. In the demo, Vite serves the client and proxies /api to this server.
//   server.use(express.static(path.join(__dirname, 'client/dist')));
//   server.get('/{*splat}', (req, res) => res.sendFile(path.join(__dirname, 'client/dist/index.html')));

// Specify the path to the environment variablef file 'config.env'

// async function to connect to DB
// Opens the database connection. The server only starts listening after it succeeds.
async function connectDB() {
  try {
    // connecting to Database with our config.env file and DB is constant in config.env
    // Connects with the address stored in the environment (not shown here).
    await mongoose.connect(process.env.DB);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    // If the database is unreachable the process exits, so we never serve requests without data.
    process.exit(1);
  }
};

// Starts the HTTP listener.
function startServer() {
  // 0.0.0.0 and process.env.PORT are needed on AWS
  // 0.0.0.0 means accept connections on every network interface.
  const hostname = "0.0.0.0"; // Define server hostname
  // Use the PORT setting if present, otherwise 8000.
  const port = process.env.PORT || 8000; // Define port number
 
  // Start the server and listen on the specified hostname and port
  // server.listen begins accepting requests and runs the callback once ready.
  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
}

// call connectDB first and when connection is ready we start the web server
// Connect first, then listen. This ordering is why the demo fixture has to replace the DB connection before startup.
connectDB().then(startServer);


