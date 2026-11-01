# StudySpot Finder

A dynamic, data-driven web application that helps students discover, review, and save study spots across different buildings. Built with Node.js, Express.js, and MongoDB as part of the IS113 Web Application Development I group project.

---

## About the Project

StudySpot Finder allows students to browse study spots organized by building, leave reviews, report inappropriate reviews, and save their favourite spots. Admins can manage buildings, study spots, and moderate reported reviews. The app includes role-based access control with a student to admin  request system.

---

## Codebase Guide

A full walkthrough of the Vue + Express structure (every file, every `/api` endpoint, every page, the legacy EJS backup, and known limits):

- **In the repo:** [docs/codebase-guide.html](docs/codebase-guide.html) (download or clone, then open it in a browser)
- **Live version:** https://claude.ai/artifact/7m8xgVB5WyMME8ZfhgqAn7 (only opens for people it has been shared with)

---

## Features

**Student Features:**
- Register and log in with secure password hashing (bcrypt)
- Edit profile (username, email, password)
- Browse buildings and view available study spots in each building
- Add, edit, and delete reviews for study spots
- Report inappropriate reviews with reason and description
- Edit submitted reports before admin review
- Save study spots to a personal favourites list
- Request admin privileges
- Delete own account

**Admin Features:**
- Create, update, and delete buildings
- Create, update, and delete study spots in building
- View and moderate reported reviews (approve report to delete review, or decline report)
- Approve or deny student admin requests
- Admin navigation bar and profile page

**Security & Authentication:**
- Session-based authentication using express-session
- Password encryption with bcrypt
- Middleware-protected routes (isLoggedIn, isAdmin)
- Role-based authorisation (Student vs Admin)
- Form validation and error handling on all forms

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 
- **Database:** MongoDB Atlas
- **Templating Engine:** EJS
- **Authentication:** express-session + bcrypt
- **Environment Variables:** dotenv

---

## Project Structure

```
├── server.js                  # Main entry point, Express app setup, DB connection
├── config.env                 # Environment variables (DB connection string, session secret)
├── package.json               # Dependencies
│
├── controllers/               # Business logic
│   ├── admin-request-controller.js
│   ├── building-controller.js
│   ├── favourites-controller.js
│   ├── report-controller.js
│   ├── reviews-controller.js
│   ├── studyspot-controller.js
│   └── user-controller.js
│
├── models/                    # MongoDB schemas and data operations
│   ├── admin-request-model.js
│   ├── building-model.js
│   ├── favourites-model.js
│   ├── reports.js
│   ├── reviews-model.js
│   ├── studyspot-model.js
│   └── user-model.js
│
├── routes/                    # Express route definitions
│   ├── admin-request-routes.js
│   ├── buildings-routes.js
│   ├── favourites-routes.js
│   ├── report-routes.js
│   ├── reviews-route.js
│   ├── studyspot-routes.js
│   └── user-routes.js
│
├── middleware/                # Authentication middleware
│   └── auth-middleware.js
│
├── views/                     # EJS templates
│   ├── home.ejs               # Home page (building list)
│   ├── login.ejs              # Login page
│   ├── register.ejs           # Registration page
│   ├── profile.ejs            # Student profile
│   ├── admin-profile.ejs      # Admin profile with pending requests
│   ├── edit-profile.ejs       # Edit profile form
│   ├── add-building.ejs       # Add building form (admin)
│   ├── edit-building.ejs      # Building list for editing (admin)
│   ├── update-building.ejs    # Update building form (admin)
│   ├── delete-building.ejs    # Delete building confirmation (admin)
│   ├── building-spots.ejs     # Study spots in a building
│   ├── studyspot-list.ejs     # All study spots list (admin)
│   ├── studyspot-details.ejs  # Study spot detail view (admin)
│   ├── add-studyspot.ejs      # Add study spot form (admin)
│   ├── edit-studyspot.ejs     # Edit study spot form (admin)
│   ├── delete-studyspot.ejs   # Delete study spot confirmation (admin)
│   ├── display-reviews.ejs    # Reviews for a study spot
│   ├── add-review.ejs         # Add review form
│   ├── user-reviews.ejs       # User's own reviews
│   ├── update-review.ejs      # Edit review form
│   ├── show-marked-review.ejs # Review marked for deletion
│   ├── favourites.ejs         # User's favourite spots
│   ├── new-report.ejs         # Submit a report form
│   ├── edit-report.ejs        # Edit report form
│   ├── report-outcome.ejs     # Report submission result
│   ├── admin-reports.ejs      # Admin view of pending reports
│   └── error.ejs              # Error page 
│
├── public/                    # Static assets
│   └── styles.css             # CSS stylesheet
```

---

## Setup Instructions

### Prerequisites

- **Node.js** 
- **npm**
- An internet connection (the app connects to MongoDB Atlas)

### Step-by-Step Setup

1. **Extract the zip file** to a folder of your choice.

2. **Open a terminal** and navigate to the project root folder:
   ```bash
   cd "IS113_G1_Group2_Project"
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```
   This will install the following packages: express, mongoose, ejs, dotenv, express-session, bcrypt.

4. **Verify the `config.env` file** exists in the root folder with the following contents:
   ```
   DB=mongodb+srv://ilovewad:ilovewad@waddev.pebolad.mongodb.net/wad
   SECRET=studyspotsecret
   ```

---

## How to Run

1. **Start the server:**
   ```bash
   nodemon server.js
   ```

2. You should see the following output in the terminal:
   ```
   MongoDB connected successfully
   Server running at http://localhost:8000/
   ```

3. **Open your browser** and go to:
   ```
   http://localhost:8000/index.html
   ```
   This will redirect you to the home page (you will need to log in first).

---

## How to Test

Install the dev tools once (Vitest and Playwright) and Playwright's browser:
```bash
npm ci
npx playwright install chromium
```
(`npm ci` installs exactly what is in package-lock.json. On npm 10, `npm install` can fail with
"Cannot read properties of null (reading 'edgesOut')"; `npm ci` or npm 11 avoids it.)

**Unit tests (Vitest + node:test)**: no database needed.
```bash
npm test          # all unit tests
npm run test:unit # only the Vitest tests in test/unit
```
- `test/unit/cascade-service.spec.js` checks that deleting a review, study spot, building or account also
  deletes the records that depend on it (reports, reviews, votes, favourites, check-ins, alerts, admin
  requests), in the right order, and that renaming a spot or username keeps them attached. Model calls are
  replaced with `vi.spyOn` stubs, so the tests are repeatable and never touch the real data.
- `test/unit/reviews.spec.js` checks review validation (rating, noise level) and the vote helpers
  (one vote per user, no voting on your own review, scores, most-helpful-first sorting).

**End-to-end tests (Playwright)**: drive the real app in a browser.
```bash
npm run dev       # terminal 1: start the app
npm run test:e2e  # terminal 2: run the browser tests (desktop and mobile sizes)
npx playwright show-report   # optional: open the HTML report
```
- `e2e/student-journey.spec.mjs`: register, log in, favourite a spot, write (with a noise level), edit and
  report a review, delete the review (its report must go too), delete the account.
- `e2e/review-votes.spec.mjs`: a second student upvotes, switches to downvote and takes the vote back;
  the vote survives a reload; authors cannot vote on their own review.
- `e2e/admin-moderation.spec.mjs`: an admin approves one report (review deleted) and declines another
  (review kept). It needs an admin login and is skipped without one:
  `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:e2e`

Every spec creates throw-away accounts and deletes them at the end, so they are safe to run against the
shared database. Each spec runs at desktop and phone sizes.

---

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

The application uses **7 MongoDB schemas** with relationships between them:

| Schema           | Key Fields                                                                     | Relationships                             |
|------------------|--------------------------------------------------------------------------------|-------------------------------------------|
| **User**         | username, email, password, school (array), role, createdAt                     | Referenced by AdminRequest, Review        |
| **Building**     | buildingname, floors, postal (unique)                                          | Referenced by StudySpot (via name)        |
| **StudySpot**    | buildingName, name, floor, seatCount, hasPowerSocket, noiseLevel               | Belongs to Building, referenced by Review |
| **Review**       | buildingName, userId, roomId, title, content, rating                           | Referenced by Report                      |
| **Report**       | reviewId (ObjectId ref), reportedBy, description, reason, status               | References Review                         |
| **AdminRequest** | userId (ObjectId ref), username, status                                        | References User                           |
| **Favourite**    | userName, spotName, buildingName, floor, seatCount, hasPowerSocket, noiseLevel | Linked to User and StudySpot by name      |

All schemas include timestamps (createdAt, updatedAt).

---

## AI/LLM Usage Disclosure

AI/LLM tools were used for the following lower-order thinking tasks:

- Debugging and understanding error messages
- CSS styling suggestions
- Outlining the structure for the README file

