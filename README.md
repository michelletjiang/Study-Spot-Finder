# StudySpot Finder

An IS216 Web Application Development 2 project for discovering, comparing, reviewing and saving
study spots. The current website uses Vue 3; Express provides its JSON API and serves the built website.
MongoDB stores accounts, buildings, study spots, reviews, favourites, check-ins and alerts.

## Application and repository

| | |
|---|---|
| **Deployed app (first page)** | https://study-spot-finder-ln3r.onrender.com |
| **Git repository** | https://github.com/michelletjiang/Study-Spot-Finder |
| **Local first page** | http://localhost:8000 (after following [Setup](#setup) and [Run](#run-for-assessment--production)) |
| **Login details** | See [Default Credentials](#default-credentials) (one Student and one Admin account) |

If the deployed site takes a while to load the first time, the host is waking the server up; wait up to a minute and refresh.

### Origin of the code

This project builds on a team member's IS113 (WAD1) Express + EJS study-spot app, uploaded as the
repository's first commit (18 Sep 2026): its user, building, study-spot, review, report and favourite
models and their CRUD handlers. Everything else was built in IS216, including the Vue 3 website (the EJS
pages are no longer served), interactive floorplans, the live noise heatmap, seat check-ins and crowd
counts, spot alerts, preference ranking and comparison, OneMap geocoding and directions, review votes,
the admin moderation queue, and the automated test suites.

## Quick tour for assessors

1. Open the deployed app and log in as the Student account from [Default Credentials](#default-credentials).
2. **Find a spot:** on the home page choose **Rank spots by what I need →** to rank spots by your preferences.
   Click **Compare** on two or three spots, then use the **Compare** tray at the bottom of the screen.
3. **Floorplan:** open **Li Ka Shing Library**, pick a floor and click a room to see its seats, reviews and issues.
4. **Live noise heatmap:** on the same floor choose **Noise now** in the colour options. Rooms are coloured
   from Quiet (pale blue) to Loud (red), and rooms with no ratings in the last hour are striped.
5. **Rate the noise:** click a room, choose **Check in here**, then answer "How loud is it?". The room's colour
   updates straight away. Only a student checked in to that room can rate it.
6. **Directions:** open **Map and directions** on a building page for a OneMap walking route.
7. **Reviews and favourites:** on a spot page, save it to favourites and write, edit, vote on or report a review.
8. **Admin:** log in as the Admin account and open the **Admin** menu: **Edit Buildings** / **Edit Study Spots**
   to manage them, and **Pending Reports** to delete or keep reported reviews.

Noise ratings only count for an hour, so the heatmap is mostly striped when no one has rated recently.
To fill it with demo ratings (CONNEX level 4 and every floor of LKCSB, SOA, YPHSL and SOSS/CIS), run
`npm run seed:noise` against the database; re-run it to refresh them, or `npm run seed:noise -- --remove`
to delete them. The demo ratings never replace real students' ratings. For a demo where every room on
every heatmap floor (all eight buildings) shows a colour, run `npm run seed:noise -- --all` within the hour before.

## Features

- Browse buildings and interactive floorplans; inspect study-spot details.
- Rank nearby spots by preferences and compare a shortlist.
- View OneMap directions, active seat check-ins, reported issues and usual crowd comparisons.
- Save favourites; write reviews with ratings and noise reports; vote on and report reviews.
- Register, sign in and manage a profile.
- Admins manage buildings and spots, moderate reported reviews and approve admin requests.

## Map layout

On building and floor pages, **Map and directions** sits below the page content, so it does not cover
room details, favourites or comparison controls. On screens up to 760px wide, use **Show map** to open
it and **Hide map**, the **Close map** button or Escape while focused inside the map to close it.
Closing returns keyboard focus to Show map. The homepage keeps its existing embedded map.

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

## Testing

The application is tested at three levels. All automated tests are repeatable: the database-free tests
replace the database with test doubles, and the browser tests create their own throw-away accounts with
unique names and delete them (and everything they made) at the end, so they can be re-run against the
shared database.

| Level | Tool | Where | What it checks |
|-------|------|-------|----------------|
| End-to-end | Playwright | `e2e/` | Real user journeys through the Vue website in Chrome, on desktop and Pixel 7 (phone) screen sizes |
| HTTP / integration | Node test runner | `test/*.test.js` | API handlers, the built website being served, OneMap token handling and directions |
| Unit | Vitest | `test/unit/` | Business rules: review validation, access control, cascade deletes, the noise heatmap's scoring and colours |

### Run all database-free tests

After [Setup](#setup), including `npm run build`:

```sh
npm test            # Node HTTP/integration tests, then all Vitest unit tests
npm run test:unit   # only the Vitest unit tests
```

These need no database connection. `test/frontend-serving.test.js` starts Express on a temporary port and
checks the built homepage, login and registration, nested URLs, frontend assets, JSON API responses and
rejection of legacy form posts. It reads `client/dist`, so build the frontend first.

### Run the end-to-end tests

Use a database that already has study spots (the project database, or one seeded with `npm run seed:spots`).

```sh
npx playwright install chromium   # one-time: download the test browser
npm run dev                       # terminal 1: Express on :8000, Vue on :5173
npm run test:e2e                  # terminal 2: every spec on desktop Chrome and Pixel 7
npx playwright show-report        # optional: HTML report, with screenshots of any failure
```

The admin tests log in as the admin account from [Default Credentials](#default-credentials). To use a
different admin, pass `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:e2e`. Room-based tests use known rooms on
Li Ka Shing Library level 3 (RM3-1 to RM3-3), so the database needs the floor-plan spots (`npm run seed:spots`).

### End-to-end test cases

| Spec | Journey | Checks |
|------|---------|--------|
| `student-journey.spec.mjs` | Register, log in, open a spot, save it to favourites, write and edit a review with a noise level, report it, delete it, delete the account | Each step is shown in the UI; an author cannot report their own review (403); a review cannot be reported twice while pending (409); deleting a review also deletes its reports; a deleted account can no longer log in |
| `review-votes.spec.mjs` | A second student upvotes, switches to a downvote, and takes the vote back | Counts and pressed states update; switching moves the vote rather than doubling it; the vote is still there after a reload; authors cannot vote on their own review (403) |
| `admin-moderation.spec.mjs` | An admin works through the reported-reviews queue | Approving a report deletes the review; declining keeps it |
| `checkin-noise.spec.mjs` | Open a floor plan, switch on **Noise now**, pick a room, check in, rate it Loud, check out | Rating without a check-in is refused (button hidden and 403); check-in takes a seat and check-out frees it; the rating is saved and counted, and the room's label on the heatmap shows it |
| `compare.spec.mjs` | Pick two spots from their pages, compare, add a third, remove one | The tray counts the picks; cards appear in the chosen order; removing a spot keeps the rest; the server only accepts 2 or 3 different spots (400 otherwise) |
| `access-control.spec.mjs` | A logged-out visitor opens a protected page; a student types an admin URL | Login is required (redirect, then back to the page asked for; API 401); students are sent home from admin pages and refused admin API calls (403) |
| `admin-catalogue.spec.mjs` | An admin adds, edits and deletes a study spot through the forms | Students see the new spot and the edit; an invalid floor is rejected with a message; after deleting, the spot is gone for everyone |
| `my-pages.spec.mjs` | Favourite a spot and remove it; write a review and delete it from My reviews | My favourite spots and My reviews show the right items; removals take effect everywhere |

Every spec makes its own throw-away accounts and deletes them at the end, which also deletes their reviews,
favourites, check-ins and noise ratings; the admin catalogue test also removes the spot it adds. The tests find
elements by role and visible label (`getByRole`, `getByLabel`), which keeps them stable when the styling changes. Each spec runs one test at a time with one retry, to absorb a slow first
response from MongoDB Atlas.

### Manual test cases

These features are checked by hand; their logic is also covered by the unit tests named.

| ID | Feature | Steps | Expected result |
|----|---------|-------|-----------------|
| M1 | Noise heatmap | Log in, open Li Ka Shing Library, level 3, choose **Noise now** | Legend shows Quiet to Loud; rooms without ratings are striped (`noise-heat.spec.js`) |
| M2 | Quiet rooms list | Rate another room **Quiet** | It appears under **Quiet right now** |
| M3 | Directions (OneMap) | Open **Map and directions** on a building page and request a route | A walking route is drawn on the map (`directions-integration.test.js`) |
| M4 | Responsive layout | Chrome DevTools, from 375 × 667 (iPhone 6) up to 1400px wide | No horizontal scrolling; on screens up to 760px the map opens with **Show map** and closes with **Hide map**, **Close map** or Escape, and focus returns to Show map |

## User Accounts & Roles

### Roles

| Role    | Description                                                                 |
|---------|-----------------------------------------------------------------------------|
| Student | Can browse spots, write/edit/delete reviews, report reviews, save favourites |
| Admin   | All student features + manage buildings, study spots, and moderate reports   |

### How to Create an Account

- Go to `/register` on the deployed app (https://study-spot-finder-ln3r.onrender.com/register) or locally (`http://localhost:8000/register`) and fill in the registration form.
- All new accounts are created with the **Student** role by default.
- Students can request admin access from their profile page. An existing admin must approve the request.

### Default Credentials

These accounts work on the deployed app and with the project database.


| Email                | Password   | Role    |
|----------------------|------------|---------|
| usertest@gmail.com   | 12345678   | Student |
| admintest@gmail.com  | 12345678   | Admin   |

---

## Database Design

The active application uses **10 MongoDB schemas** with relationships between them:

| Schema           | Key Fields                                                                     | Relationships                             |
|------------------|--------------------------------------------------------------------------------|-------------------------------------------|
| **User**         | username, email, password, school (array), role, createdAt                     | Referenced by AdminRequest, Review        |
| **Building**     | buildingname, floors, postal (unique)                                          | Referenced by StudySpot (via name)        |
| **StudySpot**    | buildingName, name, floor, seatCount, hasPowerSocket, noiseLevel               | Belongs to Building, referenced by Review |
| **Review**       | buildingName, userId, roomId, title, content, rating                           | Referenced by Report                      |
| **Report**       | reviewId (ObjectId ref), reportedBy, description, reason, status               | References Review                         |
| **AdminRequest** | userId (ObjectId ref), username, status                                        | References User                           |
| **Favourite**    | userName, spotName, buildingName, floor, seatCount, hasPowerSocket, noiseLevel | Linked to User and StudySpot by name      |

The live layer that students generate uses three more schemas:

| Schema             | Key Fields                                       | Relationships                                      |
|--------------------|--------------------------------------------------|----------------------------------------------------|
| **CheckIn**        | spot, user, check-in and check-out times         | References StudySpot and User; powers seats free now and usual crowd comparisons |
| **NoiseReport**    | spot, userId, status (Quiet / Moderate / Loud), createdAt | References StudySpot and User; powers the live noise heatmap (last hour only) |
| **StudySpotAlert** | spot, issue message, confirms, disputes          | References StudySpot                               |

`models/crowd-report-model.js` is left over from an earlier version; its routes are not mounted, so it is not used.

---

## AI/LLM Usage Disclosure

AI/LLM tools were used for the following lower-order thinking tasks:

- Debugging and understanding error messages
- CSS styling suggestions
- Outlining the structure for the README file


This deployment update also used AI assistance to configure Express to serve the Vue build, write the
HTTP regression test, and update setup documentation. Review the full disclosure against the team's
actual use and the course requirements before submission.
