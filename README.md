# StudySpot Finder

An IS216 Web Application Development 2 project for discovering, comparing, reviewing and saving
study spots. The current website uses Vue 3; Express provides its JSON API and serves the built website.
MongoDB stores accounts, buildings, study spots, reviews, favourites, check-ins and alerts.

## Application and repository

- Local first page: http://localhost:8000 (sign in when prompted).
- Repository: https://github.com/michelletjiang/Study-Spot-Finder (currently private; assessors need access).
- Hosted URL: not recorded here yet. Add the final deployed first-page URL before submission.

## Features

- Browse buildings and interactive floorplans; inspect study-spot details.
- Rank nearby spots by preferences and compare a shortlist.
- View OneMap directions and recent crowd check-ins in the building interface.
- Save favourites; write reviews with ratings and noise reports; vote on and report reviews.
- Register, sign in and manage a profile.
- Admins manage buildings and spots, moderate reported reviews and approve admin requests.

## Technology and files

- Frontend: Vue 3, Vue Router, Bootstrap, Leaflet and Vite.
- Backend: Node.js, Express 5, MongoDB/Mongoose, express-session and bcrypt password hashing.
- External API: OneMap, requested asynchronously through the Express backend.

```text
server.js             Express setup, JSON API, Vue hosting and database startup
client/src/           Active Vue pages, components, stores and styles
client/public/        Frontend assets, including floorplans
client/dist/          Generated production website (run npm run build; not committed)
routes/api/           Active JSON API routes
controllers/          Request handlers; legacy handlers remain for reference
models/, services/    Data models and shared logic
middleware/           Server-side authentication and authorisation
config.env.example    Configuration template without real credentials
test/                 Database-free HTTP and unit tests
e2e/                  Playwright browser tests
views/, public/       Historical EJS templates and styles; no longer served
routes/*-routes.js    Historical page routers; no longer mounted by server.js
```

The older `docs/codebase-guide.html` describes the migration and may contain outdated routing and
feature details. Use this README for the current setup and startup instructions.

## Setup

Use Node.js 22.12 or newer (Node.js 24 was used for verification), npm, and a reachable MongoDB
instance. MongoDB Atlas requires network access and an allowed IP address. OneMap directions need
internet access and a OneMap account.

1. Extract or clone the project and open a terminal in the folder containing `server.js` and `package.json`.
2. Install backend and test dependencies:

   ```sh
   npm ci
   ```

3. If `config.env` does not already exist, copy the example:

   ```sh
   cp config.env.example config.env
   ```

   Edit `config.env` with your own values. Keep an existing working configuration rather than
   replacing it with the example. Hosted environment variables can supply these settings instead.

   | Setting | Purpose |
   |---------|---------|
   | `DB` | MongoDB connection URI for the project's populated database. A new empty database has no study spots or pre-created accounts. |
   | `SECRET` | A long random session-signing secret. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. |
   | `PORT` | Express port; defaults to `8000`. |
   | `ONEMAP_EMAIL` | OneMap account email for directions and geocoding. |
   | `ONEMAP_PASSWORD` | OneMap account password. Without OneMap credentials, routing/geocoding cannot succeed; the rest of the application can run. |

   Do not commit `config.env` or put database/provider credentials in the README.

4. Install the frontend dependencies and build the website:

   ```sh
   npm run build
   ```

   This runs `npm ci` inside `client`, then generates `client/dist/index.html` and its assets.

## Run for assessment / production

From the project root:

```sh
npm start
```

After MongoDB connects, open **http://localhost:8000** (or the configured `PORT`).
Express serves both the Vue website and `/api` from this address. No Vite development server is needed.
`/index.html` also loads the Vue website. Direct links such as `/find`, `/building/SCIS%201` and
`/spots/<spot-id>` load the same website shell; Vue Router displays the requested screen after login.

After frontend source changes, run `npm run build` again. Backend changes require restarting Express.
Sessions currently live in memory, so restarting Express signs users out.

For a Node.js hosting service, use the project root as its working directory, provide the environment
settings above, run `npm ci` followed by `npm run build` during deployment, and use `npm start` as the
start command. Route the public website to Express's configured port. Use HTTPS for browser location
access outside localhost. Verify the deployed first page and refresh a nested URL before submission.

The production build contains frontend files only. Keep the API server and its configuration available;
opening `client/dist/index.html` directly as a local file does not run the application.

## Development

Complete Setup first, then run:

```sh
npm run dev
```

Open **http://localhost:5173** (or the address Vite prints if that port is occupied).
Vite updates Vue pages while editing and proxies `/api` to Express on port 8000. The development
proxy assumes Express uses port 8000; a custom backend port also needs a matching proxy setting in
`client/vite.config.js`.

The Mac `run-study-spot.command` launcher starts this development setup.

## Tests

After Setup (including the frontend build), run:

```sh
npm test
```

These tests need no database connection. They cover comparison helpers and API handlers, review
validation/votes, ownership checks, cascade cleanup, OneMap token handling and theme contrast.
`test/frontend-serving.test.js` starts Express on a temporary local port and checks the actual built
homepage, login/registration and nested URLs, frontend assets, JSON API responses and rejection of
legacy form posts. It reads `client/dist`, so build the frontend before running it.

For just the Vitest suites in `test/unit`:

```sh
npm run test:unit
```

For browser tests, use a dedicated test database with study spots. These tests create accounts and
reviews and delete their test data; interrupted runs may need cleanup.

```sh
npx playwright install chromium
npm run dev                  # terminal 1
npm run test:e2e              # terminal 2: desktop Chrome and Pixel 7 sizes
npx playwright show-report   # optional
```

- `student-journey.spec.mjs`: registration, login, favourites, review noise/editing, reporting and cleanup.
- `review-votes.spec.mjs`: upvote/downvote switching, removing votes, reload persistence and author restrictions.
- `admin-moderation.spec.mjs`: delete or keep reported reviews. Skipped unless an existing admin is supplied:

  ```sh
  ADMIN_EMAIL=your-test-admin-email ADMIN_PASSWORD=your-test-admin-password npm run test:e2e
  ```

The browser suite currently targets the development address on port 5173; the database-free HTTP test
checks production serving separately.

## User Accounts & Roles

### Roles

| Role    | Description                                                                 |
|---------|-----------------------------------------------------------------------------|
| Student | Can browse spots, write/edit/delete reviews, report reviews, save favourites |
| Admin   | All student features + manage buildings, study spots, and moderate reports   |

### How to Create an Account

- Go to `http://localhost:8000/register` and fill in the registration form.
- All new accounts are created with the **Student** role by default.
- Students can request admin access from their profile page. An existing admin must approve the request.

### Default Credentials

| Email                | Password   | Role    |
|----------------------|------------|---------|
| usertest@gmail.com   | 12345678   | Student |
| admintest@gmail.com  | 12345678   | Admin   |

---

## Database Design

The application uses **9 MongoDB schemas** with relationships between them:

| Schema           | Key Fields                                                                     | Relationships                             |
|------------------|--------------------------------------------------------------------------------|-------------------------------------------|
| **User**         | username, email, password, school (array), role, createdAt                     | Referenced by AdminRequest, Review        |
| **Building**     | buildingname, floors, postal (unique)                                          | Referenced by StudySpot (via name)        |
| **StudySpot**    | buildingName, name, floor, seatCount, hasPowerSocket, noiseLevel               | Belongs to Building, referenced by Review |
| **Review**       | buildingName, userId, roomId, title, content, rating                           | Referenced by Report                      |
| **Report**       | reviewId (ObjectId ref), reportedBy, description, reason, status               | References Review                         |
| **AdminRequest** | userId (ObjectId ref), username, status                                        | References User                           |
| **Favourite**    | userName, spotName, buildingName, floor, seatCount, hasPowerSocket, noiseLevel | Linked to User and StudySpot by name      |

The other two schemas are `CrowdReport` (recent crowd check-ins linked to a spot and user) and
`StudySpotAlert` (spot alerts and their confirm/dispute votes).

---

## AI/LLM Usage Disclosure

AI/LLM tools were used for the following lower-order thinking tasks:

- Debugging and understanding error messages
- CSS styling suggestions
- Outlining the structure for the README file


This deployment update also used AI assistance to configure Express to serve the Vue build, write the
HTTP regression test, and update setup documentation. Review the full disclosure against the team's
actual use and the course requirements before submission.
