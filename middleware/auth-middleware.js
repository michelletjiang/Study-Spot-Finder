exports.isLoggedIn = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

exports.isAdmin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (req.session.user.role !== 'Admin') return res.redirect('/profile');
    next();
};

exports.ownerOrAdmin = (field = 'userId') => (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (req.session.user.role === 'Admin' || String(req.params[field] || req.body[field]) === String(req.session.user.id)) return next();
    return res.status(403).render('error', { message: 'You are not allowed to change this resource.' });
};
