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

Prerequisites: Node.js 20+ and npm. From the repository root:

```sh
npm ci
npm run check && npm test
npm run demo
```

Open `http://127.0.0.1:8000`. `npm run demo` downloads or reuses the project-local `mongodb-memory-server` binary, creates a fresh loopback-only disposable database, seeds synthetic accounts, and starts Express. It never accepts `DB` from the environment, so seed deletion cannot target Atlas or another remote database. Stop with Ctrl-C; all data disappears. Demo credentials (local demo mode only): `student.demo@local.test` / `DemoPass123!` and `admin.demo@local.test` / `DemoPass123!`. Never enable demo mode or use seeded credentials in production. The first MongoDB and Playwright browser downloads are machine-dependent. No Atlas, OneMap, AWS or remote secret is required.

Browser proof is runnable with `npm run test:e2e`; Playwright starts the same real Mongoose-backed demo server and stores temporary output in `test-results/`. Retained screenshots: [`student-profile-desktop.png`](evidence/student-profile-desktop.png), [`admin-workspace-desktop.png`](evidence/admin-workspace-desktop.png), and [`login-mobile.png`](evidence/login-mobile.png).

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

Executed on the committed delivery head:

- `npm run check` - passed (Node syntax checks).
- `npm test` - 3 passed (health, not-found, CSRF foundation tests).
- `npm run demo` - passed clean-config startup; `/health/live` returned `{\"status\":\"ok\"}` at `http://127.0.0.1:8000`.
- `npm run test:e2e` - **7 passed** against real Mongoose and an ephemeral loopback MongoDB, including registration/login/profile edit/reload/logout, bad login, duplicate registration, role tampering, authenticated Student denial, unauthenticated protection, Admin journey, keyboard focus and mobile overflow.
- Screenshots: [`student-profile-desktop.png`](evidence/student-profile-desktop.png), [`admin-workspace-desktop.png`](evidence/admin-workspace-desktop.png), [`login-mobile.png`](evidence/login-mobile.png).
- E2E source: [`e2e/auth.spec.js`](../../e2e/auth.spec.js); implementation paths: [`controllers/user-controller.js`](../../controllers/user-controller.js), [`middleware/auth-middleware.js`](../../middleware/auth-middleware.js), [`middleware/security-middleware.js`](../../middleware/security-middleware.js), [`scripts/demo.js`](../../scripts/demo.js).

Runnable URL: `http://127.0.0.1:8000`. Limitations: local-only rehearsal, ephemeral data, no remote services, public deployment, OneMap or AWS. This is a Week 9 working slice, not the complete proposal or production-ready deployment.
