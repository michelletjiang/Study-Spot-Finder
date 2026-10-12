const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

// .env is the supported runtime configuration. config.env is intentionally ignored.
dotenv.config({ path: path.join(__dirname, '.env') });
const userRoutes = require('./routes/user-routes');
const buildingsRoutes = require('./routes/buildings-routes');
const studySpotRoutes = require('./routes/studyspot-routes');
const reviewsRoute = require('./routes/reviews-route');
const reportRoutes = require('./routes/report-routes');
const adminRequestRoutes = require('./routes/admin-request-routes');
const favRoutes = require('./routes/favourites-routes');
const { csrf, requestLocals, notFound, errorHandler } = require('./middleware/security-middleware');

function validateConfig() {
  const missing = ['DB', 'SECRET'].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

function createApp() {
  const app = express();
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, 'public')));
  const sessionOptions = {
    secret: process.env.SECRET || 'test-only-secret', resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86400000 }
  };
  // Production deployments can opt into a durable MongoDB session store.
  if (process.env.MONGO_SESSION_STORE === 'true' && process.env.DB) sessionOptions.store = MongoStore.create({ mongoUrl: process.env.DB });
  app.use(session(sessionOptions));
  app.use(requestLocals);
  app.use(csrf);
  app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ready' : 'unready' }));
  app.use('/', userRoutes);
  app.use('/', buildingsRoutes);
  app.use('/', studySpotRoutes);
  app.use('/', reviewsRoute);
  app.use('/', reportRoutes);
  app.use('/', adminRequestRoutes);
  app.use('/', favRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

async function start() {
  validateConfig();
  await mongoose.connect(process.env.DB);
  const port = Number(process.env.PORT || 8000);
  return createApp().listen(port, 'localhost', () => console.log(`Server running at http://localhost:${port}/`));
}

if (require.main === module) start().catch((error) => { console.error(error.message); process.exit(1); });
module.exports = { createApp, start, validateConfig };
