const User = require('../models/user-model');
const AdminRequest = require('../models/admin-request-model');
const bcrypt = require('bcrypt');
// Keep form defaults in one place so validation errors can return a predictable page model.
const render = (res, view, data = {}) => res.render(view, { error: [], form: {}, notice: '', ...data });

exports.registerGet = (req, res) => render(res, 'register');
exports.registerPost = async (req, res) => {
  try {
    // Only these fields are accepted from the browser. In particular, role is not copied from
    // req.body: every public registration is deliberately assigned the Student role on the server.
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const rawPassword = String(req.body.password || '').trim();
    const selectedSchools = (Array.isArray(req.body.school) ? req.body.school : [req.body.school]).filter(Boolean);
    const errors = [];
    if (username.length < 5) errors.push('Username must be at least 5 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email address.');
    if (rawPassword.length < 8) errors.push('Password must be at least 8 characters.');
    if (!selectedSchools.length) errors.push('Select at least one school.');
    if (selectedSchools.length > 2) errors.push('Please select no more than two schools.');
    if (errors.length) return render(res, 'register', { error: errors, form: req.body });
    // Friendly duplicate checks avoid an unnecessary create attempt; schema uniqueness remains
    // a database-level backstop for races between two requests.
    if (await User.findOne({ username })) errors.push('Username already taken.');
    if (await User.findOne({ email })) errors.push('Email already registered.');
    if (errors.length) return render(res, 'register', { error: errors, form: req.body });
    // Never store the password itself. bcrypt hashes it with a work factor, and login later
    // uses bcrypt.compare rather than trying to recover the original password.
    await User.create({ username, email, school: selectedSchools, role: 'Student', password: await bcrypt.hash(rawPassword, 12) });
    res.redirect('/login?registered=1');
  } catch (error) {
    console.error(error);
    render(res, 'register', { error: ['Registration failed, please try again.'], form: req.body });
  }
};

exports.loginGet = (req, res) => render(res, 'login', { notice: req.query.registered ? 'Account created. You can now sign in.' : '' });
exports.loginPost = async (req, res) => {
  try {
    // Normalise the lookup but keep the submitted email in the form when showing an error.
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return render(res, 'login', { error: ['Email and password are required.'], form: req.body });
    const user = await User.findOne({ email });
    // One message covers both unknown email and wrong password, avoiding account enumeration.
    if (!user || !(await bcrypt.compare(password, user.password))) return render(res, 'login', { error: ['Invalid email or password.'], form: req.body });
    // Regenerate the session after authentication so an anonymous session identifier cannot
    // be reused as the authenticated session (session fixation defense).
    await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    // Store only the identity needed by middleware and templates, not the full Mongoose document.
    req.session.user = { id: user._id.toString(), username: user.username, email: user.email, school: user.school, role: user.role, createdAt: user.createdAt };
    res.redirect('/');
  } catch (error) { console.error(error); res.status(500).render('error', { message: 'Unable to sign in right now.' }); }
};

exports.profile = async (req, res, next) => {
  try {
    // The session identifies the owner; the database is the source of truth for current profile data.
    const dbUser = await User.findById(req.session.user.id);
    if (!dbUser) return req.session.destroy(() => res.redirect('/login'));
    // Refresh mutable authorization/profile fields in the session in case an admin changes them.
    req.session.user.role = dbUser.role;
    req.session.user.school = dbUser.school;
    const adminRequest = await AdminRequest.findOne({ userId: dbUser._id }).sort({ createdAt: -1 });
    render(res, dbUser.role === 'Admin' ? 'admin-profile' : 'profile', { user: dbUser, adminRequest, pendingRequests: dbUser.role === 'Admin' ? await AdminRequest.find({ status: 'Pending' }).sort({ createdAt: 1 }) : [] });
  } catch (error) { next(error); }
};
exports.adminProfile = async (req, res, next) => { try { render(res, 'admin-profile', { user: req.session.user, pendingRequests: await AdminRequest.find({ status: 'Pending' }).sort({ createdAt: 1 }) }); } catch (e) { next(e); } };
exports.editProfileGet = async (req, res, next) => { try { render(res, 'edit-profile', { user: await User.findById(req.session.user.id) }); } catch (e) { next(e); } };
exports.editProfilePost = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id); if (!user) return res.redirect('/login');
    const username = String(req.body.username || '').trim(), email = String(req.body.email || '').trim().toLowerCase(), password = String(req.body.password || '');
    const errors = [];
    if (username.length < 5) errors.push('Username must be at least 5 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email address.');
    if (password && password.length < 8) errors.push('Password must be at least 8 characters.');
    if (await User.findOne({ username, _id: { $ne: user._id } })) errors.push('Username already taken.');
    if (await User.findOne({ email, _id: { $ne: user._id } })) errors.push('Email already registered.');
    if (errors.length) return render(res, 'edit-profile', { user: { ...req.body, school: user.school, role: user.role, createdAt: user.createdAt }, error: errors });
    user.username = username; user.email = email; if (password) user.password = await bcrypt.hash(password, 12); await user.save();
    Object.assign(req.session.user, { username, email }); res.redirect('/profile');
  } catch (e) { next(e); }
};
exports.goToReviews = (req, res) => res.redirect(`/reviews/${req.session.user.id}`);
// Destroy the server-side session rather than merely hiding the user's navigation links.
exports.logout = (req, res) => req.session.destroy(() => res.redirect('/login?loggedout=1'));
exports.deleteUser = async (req, res) => { await User.deleteOne({ _id: req.session.user.id }); req.session.destroy(() => res.redirect('/')); };
