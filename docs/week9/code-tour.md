# Week 9 auth code tour

## Source provenance

This checkout combines the latest published default branch (`origin/main` at `9dd57cafa50d6506dabaa577e1a7feb2cd847d2c`, “fixed current code and made it run-able”) with the still-unmerged Jackson component history. The consolidation is a non-destructive merge; the current branch keeps the upstream study-spot routes/models and the accepted auth/layout implementation. The final commit identity is recorded in the presentation handover.

The upstream snapshot included a tracked `config.env`; it was deliberately not carried into this branch because it contained deployment configuration that must remain outside source control. No shared or Atlas database was contacted during this verification. Run the demo with a disposable loopback MongoDB through `DEMO_MODE=true PORT=18080 node scripts/demo.js`, or run the real server with `.env` values for `DB`, `SECRET`, and optional `PORT`.

This tour follows **my assigned component** in the working Week 9 demo: registration, login, profile, Student/Admin roles, route protection, and the shared layout/navbar. It describes the implementation in this checkout, not the whole proposal. Discovery, OneMap, crowd updates, deployment, and the other team's CRUD areas are proposed or separate work.

## Request flow

1. `server.js:createApp` builds the Express app, parses forms, starts a session, exposes session values to views, and applies CSRF checks before registering routes. `start` validates `DB` and `SECRET`, connects Mongoose, and listens on the configured port. The app factory is separate so tests can use the same routes without binding a port.
2. `routes/user-routes.js` maps browser URLs to controller functions. Middleware is placed before protected controllers, so typing a URL directly is treated the same as clicking a link.
3. `controllers/user-controller.js` validates input, reads/writes the `User` model, and renders or redirects. `render` supplies consistent empty `error`, `form`, and `notice` values to EJS.
4. `middleware/security-middleware.js:requestLocals` makes `user`, `session`, and `csrfToken` available to every view. `views/partials/header.ejs` uses those values for the shared navbar; each page closes it with `partials/footer.ejs`.

## Registration and roles

- `registerGet` renders the form. `registerPost` trims and normalises fields, validates username/email/password/schools, and gives friendly duplicate feedback.
- The browser can submit extra fields, but `registerPost` deliberately creates `role: 'Student'`. A client must never be trusted to promote itself to Admin. The model's `enum` and default reinforce the same two-role contract.
- Passwords are stored as bcrypt hashes (`bcrypt.hash`), never as readable passwords. Login uses `bcrypt.compare`, so the original password is not recovered or logged.
- Duplicate and invalid input errors return the form. Login uses one `Invalid email or password` response for both an unknown email and a wrong password, which avoids revealing which accounts exist.

## Login, session, and logout

`loginPost` looks up the normalised email, compares the password, regenerates the session, then stores a small `req.session.user` identity. Regenerating after authentication prevents an anonymous session id from becoming the authenticated session. `logout` destroys the session and redirects to login. The session cookie is HttpOnly, SameSite=Lax, and secure in production; production can opt into MongoDB session storage with `MONGO_SESSION_STORE=true`.

This local demo still has limits: the test-only fallback session secret is not suitable for a real deployment, and the default in-memory session store is not durable across restarts or multiple servers. `start` requires real `DB` and `SECRET`; use production configuration rather than treating the fallback as deployment security.

## Profile and access checks

- `profile` loads the user by `req.session.user.id`, so the session identifies the owner while MongoDB supplies current profile data. It refreshes mutable role/school values and renders the Student or Admin profile view.
- `editProfileGet` and `editProfilePost` use that same session id rather than accepting an arbitrary user id. Password changes are hashed again.
- `auth-middleware.js:isLoggedIn` protects authenticated routes. `isAdmin` checks the session role. `ownerOrAdmin` allows an Admin or the owner named by the configured route/body field.
- Hiding Admin/Profile links in the navbar improves usability, but it is not authorization. The middleware still rejects direct requests; a Student attempting `/admin-profile` is redirected.

## CSRF and templates

`security-middleware.js:csrf` creates one random token per session, places it in `res.locals`, and checks it on every non-GET/HEAD/OPTIONS request. The login, registration, profile, and logout forms include the token as a hidden field. The comparison uses `timingSafeEqual` after checking buffer lengths. This protects the demo's cookie-authenticated form posts against cross-site submissions; it is not a substitute for HTTPS, a strong production secret, secure deployment configuration, or broader operational controls.

`views/partials/header.ejs` is the shared layout opening and navbar. It shows signed-in links based on `user` and a POST logout form with a CSRF token. `partials/footer.ejs` closes the layout. The auth/profile templates (`register.ejs`, `login.ejs`, `profile.ejs`, `edit-profile.ejs`, and `admin-profile.ejs`) contain short EJS comments beside the important flow without changing rendered output.

## What to say

“My assigned component turns account forms into a server-checked session. Registration validates and hashes the password, and the server always assigns Student instead of trusting a role field from the browser. Login compares the hash, regenerates the session, and stores only the identity needed by the app. The profile is loaded by that session identity. Middleware protects routes and checks Admin ownership; hiding a navbar link alone would not be security. Finally, every state-changing form carries a session CSRF token. This is a working local auth demo, while the wider proposal features and production deployment remain separate.”

## Suggested presentation order

1. Start with the proposal goal and clearly separate the demonstrated auth slice from future discovery/map/crowd work.
2. Show `views/register.ejs` and `registerPost`: validation, duplicate feedback, bcrypt, and server-assigned Student role.
3. Show `loginPost`: generic failure, bcrypt compare, session regeneration, and the session identity.
4. Open the profile, edit it, reload, and log out. Point to `profile` and the owner-by-session lookup.
5. Attempt `/admin-profile` as a Student, then show `isAdmin` and the navbar's conditional link. Explain UI convenience versus server enforcement.
6. Finish at `security-middleware.js` and the hidden `_csrf` field. Mention the local-demo session-store/secret limitations and answer questions using the source tour.
