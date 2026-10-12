// Route middleware is the real access boundary. A missing or hidden navbar link is not protection.
exports.isLoggedIn = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// Admin checks happen on the server for every protected route, not just in the UI.
exports.isAdmin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (req.session.user.role !== 'Admin') return res.redirect('/profile');
    next();
};

// Resource routes can require either the administrator or the owner named by a route/body field.
exports.ownerOrAdmin = (field = 'userId') => (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (req.session.user.role === 'Admin' || String(req.params[field] || req.body[field]) === String(req.session.user.id)) return next();
    return res.status(403).render('error', { message: 'You are not allowed to change this resource.' });
};
