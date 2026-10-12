# Week 9 handover - Jackson's auth slice

## Completion checklist

- [x] Student registration with validation, duplicate feedback, bcrypt hashing: [`controllers/user-controller.js`](../../controllers/user-controller.js), [`models/user-model.js`](../../models/user-model.js)
- [x] Login with invalid-credential feedback and session regeneration: [`controllers/user-controller.js`](../../controllers/user-controller.js)
- [x] Profile display/edit and password change: [`views/profile.ejs`](../../views/profile.ejs), [`views/edit-profile.ejs`](../../views/edit-profile.ejs)
- [x] Student/Admin role enforcement: [`middleware/auth-middleware.js`](../../middleware/auth-middleware.js), admin routes
- [x] CSRF-protected POST actions and logout: [`middleware/security-middleware.js`](../../middleware/security-middleware.js)
- [x] Reusable responsive navbar/layout: [`views/partials/`](../../views/partials/), [`public/styles.css`](../../public/styles.css)
- [x] Local demo seed and presentation: [`scripts/demo.js`](../../scripts/demo.js), [`presentation/week9.html`](../../presentation/week9.html)

This is Jackson's assigned working slice, not a claim of exclusive authorship. OneMap, discovery ranking, crowd freshness, reviews/favourites, AWS and the remaining admin CRUD are team-next work or existing foundation scope, not completed by this handover.

## Clean local rehearsal

Prerequisites: Node.js 20+, npm, and MongoDB running only on `127.0.0.1`. From the repository root:

```sh
npm ci
cp .env.example .env
# Set DB=mongodb://127.0.0.1:27017/study_spot_demo and a local random SECRET in .env
npm run check && npm test
DEMO_MODE=true npm run demo
```

Open `http://localhost:8000`. Demo credentials (local demo mode only): `student.demo@local.test` / `DemoPass123!` and `admin.demo@local.test` / `DemoPass123!`. The demo script deletes and recreates only these two accounts. It never runs unless `DEMO_MODE=true`; do not use seeded credentials or a demo database in production. MongoDB's first binary/data download and initial database creation are machine-dependent. No Atlas, OneMap, AWS, public binding or remote secret is required.

## 3-minute presentation and live demo

1. **0:00-0:35** - State the problem and show slide 1: a focused account-to-study-spot entry point.
2. **0:35-1:20** - Show slide 2 and explain EJS pages, Express routes, Mongoose User model, bcrypt, and session/CSRF middleware. Clarify that the proposal's future Vue discovery frontend is not being presented as complete.
3. **1:20-2:35** - In a fresh browser: register a Student, log in, open Profile, edit username, reload, log out. Try `/admin-profile` as the Student and show it is denied. Log in as the seeded Admin and show the Admin workspace.
4. **2:35-3:00** - Show slide 3, mention automated checks and ask for team feedback on next work.

### Jackson's speaker notes

“I built the account boundary for our app. Registration deliberately creates Students - the browser cannot promote itself by sending `role=Admin`. On login, bcrypt verifies the password and Express regenerates the session. Every state-changing form carries a CSRF token, and admin access is checked on the server, not hidden in the navbar. The current pages use our existing Express/EJS architecture so this is a working slice now; the Vue discovery experience in our proposal is still planned. I will hand over OneMap and discovery/ranking decisions as the team's next work.”

## Likely Q&A

- **Where are roles stored?** In the Mongoose User model. Registration hard-codes `Student`; only an authorized server-side admin workflow can change a role.
- **How are passwords handled?** Only bcrypt hashes are stored. Login compares the submitted password to the hash.
- **What does logout do?** It destroys the server session and redirects to login. Login regenerates the session to prevent fixation.
- **How are forms protected?** A request-scoped synchronizer token is required for every non-GET request. Cookies are HttpOnly and SameSite=Lax.
- **Why EJS instead of Vue?** EJS is the foundation's working architecture for this slice. Vue discovery is a proposal direction, not falsely presented as complete.
- **Is this production-ready?** No. It is a local rehearsal and Week 9 progress slice. Deployment, secret rotation, operational monitoring and the other team features remain out of scope.

## Team next work

OneMap integration and location data, discovery/ranking and crowd freshness decisions, reviews/favourites completion, admin CRUD integration, then the planned frontend/AWS deployment work. Keep all credentials local and synthetic during rehearsal.

## Evidence receipt

- Commands: `npm ci`, `npm run check`, `npm test`, `DEMO_MODE=true npm run demo`
- Runnable URL: `http://localhost:8000`
- Scope: auth, profile, role protection, shared layout and local demo seed
- Limitations: local MongoDB required; no remote services, public deployment, OneMap or AWS
- E2E scenario list: [`e2e/auth.spec.js`](../../e2e/auth.spec.js)
