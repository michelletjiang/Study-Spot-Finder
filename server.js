// Serves the built Vue website and its JSON API from one address.
// Express is the web framework: it routes each HTTP request to a handler function.
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
// express-session keeps a logged-in user's data on the server and links it to the browser by a cookie.
const session = require('express-session');
// Load the settings (DB address, session secret, port) from config.env into process.env. Values are never printed here.
dotenv.config({ path: path.join(__dirname, 'config.env') });

// ACTIVE: routes/api/index.js collects every JSON route (auth, spots, reviews, compare and so on).
const apiRoutes = require('./routes/api');


// Create the one Express app object. Every use() and get() below attaches to it.
const server = express();
// trust the AWS load balancer so secure cookies work behind it
server.set('trust proxy', 1)
// Added note: 1 means trust one proxy hop, so req.protocol and secure cookies are right behind a load balancer.

// express.json() is a middleware
// Parse JSON request bodies into req.body. The Vue client sends JSON through client/src/api.js.
server.use(express.json());
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

// Keep the API ahead of the frontend fallback, including JSON 404 responses.
// ACTIVE: simple liveness check. The Vue client and the demo scripts use it to see that the server is up.
server.get('/api/health', (req, res) => res.json({ ok: true }));
// ACTIVE: tells the Vue client who is logged in (or null). client/src/stores/auth.js calls this on page load.
server.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));
// Every /api/... request is handed to routes/api/index.js.
server.use('/api', apiRoutes);  // new routes/api/*.js files, one per feature

const clientDist = path.join(__dirname, 'client/dist');
server.use(express.static(clientDist));
// Direct links and refreshes must reach Vue Router, not an old EJS page.
server.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

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
if (require.main === module) {
  connectDB().then(startServer);
}

// Importing the app lets HTTP tests run without opening a database connection.
module.exports = server;


