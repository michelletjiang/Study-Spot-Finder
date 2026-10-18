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

// Ownership guard: any logged-in user could previously edit or delete another
// user's review, report or favourite just by passing its id. getId pulls the id
// out of the request, load() fetches the doc, ownerOf() returns its owner's
// username.
exports.owns = (getId, load, ownerOf) => async (req, res, next) => {
    try {
        const doc = await load(getId(req));
        if (!doc) {
            return res.render('error', { message: 'Not found' });
        }
        if (ownerOf(doc) !== req.session.user.username) {
            return res.status(403).render('error', { message: 'You can only change your own entries.' });
        }
        next();
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Not found' });
    }
};
