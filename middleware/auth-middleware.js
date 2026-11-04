// Guards for the JSON routes (routes/api/*.js).
// A middleware runs before a route handler. It either answers the request itself or calls next() to continue.

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

