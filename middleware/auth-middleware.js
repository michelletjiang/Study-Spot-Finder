// MIXED file: the api* functions are ACTIVE (JSON routes used by Vue). isLoggedIn and isAdmin near the bottom are LEGACY.
// A middleware runs before a route handler. It either answers the request itself or calls next() to continue.
// Existing note below: the TODO(M1) was already done - apiLoggedIn and apiAdmin exist just under it.
// TODO(M1): add JSON versions for /api routes (Vue can't follow a redirect to an EJS page):
//   exports.apiLoggedIn -> if no session user: res.status(401).json({ message: 'Login required' })
//   exports.apiAdmin    -> 401 if not logged in, 403 { message: 'Admins only' } if role !== 'Admin'
// Keep isLoggedIn/isAdmin below until the M6 cut-over, then delete them.

// ACTIVE: guard for JSON routes. Used by routes/api/*.js, including GET /api/spots/compare, so comparison needs a login.
exports.apiLoggedIn = (req, res, next) => {
    // No user in the session means answer 401 JSON (the Vue client reads this) instead of redirecting.
    if (!req.session.user) return res.status(401).json({ message: 'Login required' });
    // Logged in, so continue to the next handler.
    next();
};

// ACTIVE: guard for admin-only JSON routes (moderation and building or spot management).
exports.apiAdmin = (req, res, next) => {
    // Not logged in: 401.
    if (!req.session.user) return res.status(401).json({ message: 'Login required' });
    // Logged in but the role is not Admin: 403.
    if (req.session.user.role !== 'Admin') return res.status(403).json({ message: 'Admins only' });
    next();
};



// LEGACY - not used by the Vue demo: same idea as apiLoggedIn but redirects to the /login EJS page, which a Vue fetch cannot follow. Used only by routes/*.js.
exports.isLoggedIn = (req, res, next) => {
    // Not logged in: send the browser to the legacy login page.
    if (!req.session.user) {
        console.log("User not logged in, redirecting to /login");
        return res.redirect('/login');
    }
    next();
};

// LEGACY - not used by the Vue demo: admin check for the old EJS routes.
exports.isAdmin = (req, res, next) => {
    if (!req.session.user) {
        console.log("User not logged in, redirecting to /login");
        return res.redirect('/login');
    }
    // Logged in but not an admin: redirect to the legacy /profile page.
    if (req.session.user.role !== 'Admin'){
        console.log("Not an admin user, redirecting to /profile");
        return res.redirect('/profile');
    }
    next();
};
