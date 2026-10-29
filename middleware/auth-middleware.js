// TODO(M1): add JSON versions for /api routes (Vue can't follow a redirect to an EJS page):
//   exports.apiLoggedIn -> if no session user: res.status(401).json({ message: 'Login required' })
//   exports.apiAdmin    -> 401 if not logged in, 403 { message: 'Admins only' } if role !== 'Admin'
// Keep isLoggedIn/isAdmin below until the M6 cut-over, then delete them.

exports.apiLoggedIn = (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ message: 'Login required' });
    next();
};

exports.apiAdmin = (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ message: 'Login required' });
    if (req.session.user.role !== 'Admin') return res.status(403).json({ message: 'Admins only' });
    next();
};



exports.isLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        console.log("User not logged in, redirecting to /login");
        return res.redirect('/login');
    }
    next();
};

exports.isAdmin = (req, res, next) => {
    if (!req.session.user) {
        console.log("User not logged in, redirecting to /login");
        return res.redirect('/login');
    }
    if (req.session.user.role !== 'Admin'){
        console.log("Not an admin user, redirecting to /profile");
        return res.redirect('/profile');
    }
    next();
};
