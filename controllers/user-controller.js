// JSON API for accounts and profiles, used by routes/api/auth-routes.js and profile-routes.js.
// User model: the users collection.
const User = require('../models/user-model');
// AdminRequest model: shows a user's request to become an admin.
const AdminRequest = require('../models/admin-request-model');
const cascade = require('../services/cascade-service'); // deletes child records with their parent
// bcrypt hashes passwords, so the database never holds the real password.
const bcrypt = require('bcrypt');
const { parsePreferences, withDefaults } = require('../lib/preferences');

// ACTIVE: JSON API used by the Vue client (LoginView.vue, RegisterView.vue, ProfileView.vue, EditProfileView.vue).
// ---------- JSON API (used by Vue) ----------

// The schools a student may pick, kept in step with the register form.
const SCHOOLS = ['LKCSB', 'SCIS', 'SOSS', 'SOA', 'SOE', 'YPHSL', 'CIS'];
// Simple email shape: something, an @, something, a dot, something.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // the old check rejected emails like john.doe@smu.edu.sg

// What the session and /api/me hold about a user. The password hash is never included.
// what the session (and /api/me) keeps about a user - never the password hash
// Builds the safe user object.
function sessionUser(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        school: user.school,
        role: user.role,
        createdAt: user.createdAt
    };
}

// POST /api/register: create an account.
// POST /api/register   body: { username, email, password, school: [codes] }
exports.apiRegister = async (req, res) => {
    // Read and tidy the body fields.
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const school = Array.isArray(req.body.school) ? req.body.school : [];

    // Collect validation messages.
    const errors = [];
    // Username, email, password and school checks, the same rules as the form.
    if (!username) errors.push('Username is required.');
    else if (username.length < 5) errors.push('Username must be at least 5 characters.');
    if (!email) errors.push('Email is required.');
    else if (!EMAIL_PATTERN.test(email)) errors.push('Please enter a valid email address.');
    if (!password) errors.push('Password is required.');
    else if (password.length < 8) errors.push('Password must be at least 8 characters.');
    if (school.length === 0) errors.push('School is required.');
    else if (school.length > 2 || !school.every(s => SCHOOLS.includes(s))) errors.push('Please select the correct schools.');
    // Any problem answers 400 with the list.
    if (errors.length > 0) return res.status(400).json({ message: errors.join(' '), errors });

    try {
        // Reject duplicate names or emails.
        if (await User.findOne({ username })) errors.push('Username already taken.');
        if (await User.findOne({ email })) errors.push('Email already registered.');
        // Duplicates answer 409.
        if (errors.length > 0) return res.status(409).json({ message: errors.join(' '), errors });

        // Save the user with a hashed password and role Student.
        await User.create({ username, email, password: await bcrypt.hash(password, 10), school, role: 'Student' });
        // 201 means created.
        res.status(201).json({ message: 'Account created. Please log in.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Registration failed, please try again.' });
    }
};

// GET /api/profile: the user and their latest admin request.
// GET /api/profile -> { user, adminRequest }
exports.apiGetProfile = async (req, res) => {
    try {
        // Reload the user from the database.
        const user = await User.findById(req.session.user.id);
        // A deleted account is treated as logged out.
        if (!user) return res.status(401).json({ message: 'Account no longer exists' });
        // sync role from DB in case an admin approved this user since last login
        // Refresh the session copy, so a role change by an admin shows up.
        req.session.user = sessionUser(user);
        // Latest admin request of this user, if any.
        const adminRequest = await AdminRequest.findOne({ userId: user._id }).sort({ createdAt: -1 });
        // Send both.
        res.json({ user: req.session.user, adminRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error loading profile' });
    }
};

// GET /api/profile/preferences: the study preferences, with defaults for anything not saved yet.
exports.apiGetPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id, { preferences: 1 }).lean();
        if (!user) return res.status(401).json({ message: 'Account no longer exists' });
        res.json(withDefaults(user.preferences));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error loading preferences' });
    }
};

// PUT /api/profile/preferences   body: { needs: { quiet, power, rated, seatsFree }, distance, seats }
exports.apiUpdatePreferences = async (req, res) => {
    const { preferences, errors } = parsePreferences(req.body);
    if (errors) return res.status(400).json({ message: errors.join(' '), errors });
    try {
        const user = await User.findByIdAndUpdate(req.session.user.id, { preferences }, { new: true, runValidators: true }).lean();
        if (!user) return res.status(401).json({ message: 'Account no longer exists' });
        res.json(withDefaults(user.preferences));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving preferences' });
    }
};

// PUT /api/profile: change username, email and optionally password.
// PUT /api/profile   body: { username, email, password? }  (blank password = keep the current one)
exports.apiUpdateProfile = async (req, res) => {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    // The user's own id as a string, to compare with others.
    const myId = req.session.user.id.toString();

    const errors = [];
    // Validate the new values.
    if (username.length < 5) errors.push('Username must be at least 5 characters.');
    if (!EMAIL_PATTERN.test(email)) errors.push('Please enter a valid email address.');
    if (password && password.length < 8) errors.push('Password must be at least 8 characters.');
    if (errors.length > 0) return res.status(400).json({ message: errors.join(' '), errors });

    try {
        // Check that no other user already has them.
        const existingUsername = await User.findOne({ username });
        const existingEmail = await User.findOne({ email });
        if (existingUsername && existingUsername._id.toString() !== myId) errors.push('Username already taken.');
        if (existingEmail && existingEmail._id.toString() !== myId) errors.push('Email already registered.');
        if (errors.length > 0) return res.status(409).json({ message: errors.join(' '), errors });

        // Load the user and apply the changes.
        const user = await User.findById(myId);
        if (!user) return res.status(401).json({ message: 'Account no longer exists' });
        const oldUsername = user.username;
        user.username = username;
        user.email = email;
        // A blank password keeps the old one.
        if (password) user.password = await bcrypt.hash(password, 10);
        // Save to the database.
        await user.save();
        // Reviews, reports and favourites store the username, so move them to the new one.
        if (oldUsername !== username) await cascade.renameUser(oldUsername, username);

        // Refresh the session copy.
        req.session.user = sessionUser(user);
        res.json({ user: req.session.user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

// DELETE /api/profile: delete the account.
// DELETE /api/profile
exports.apiDeleteAccount = async (req, res) => {
    try {
        // Remove what the account owns first: reviews (and reports on them), favourites, admin requests.
        await cascade.deleteUserData(req.session.user);
        // Remove the user.
        await User.deleteOne({ _id: req.session.user.id });
        // End the session, clear its cookie and answer with no body.
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.status(204).end();
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting account' });
    }
};

// POST /api/login: start a session.
// POST /api/login   body: { email, password }
exports.apiLogin = async (req, res) => {
    // Emails are stored in lower case, so lower-case the login email too.
    const email = String(req.body.email || '').trim().toLowerCase(); // register lowercases, so login must too
    const password = String(req.body.password || '');
    // Both fields are required.
    if (!email || !password) return res.status(400).json({ message: 'Email or Password cannot be empty' });

    try {
        // Find the user.
        const foundUser = await User.findOne({ email });
        // check foundUser BEFORE reading .password (the old loginPost crashes here)
        // Check the user exists before the password, then compare the password with the stored hash.
        if (!foundUser || !(await bcrypt.compare(password, foundUser.password))) {
            // Same message for unknown email and wrong password, so the response does not reveal which accounts exist.
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // A new session id on login stops an old or stolen id from being reused.
        // new session ID on login, so an old/stolen ID can't be reused
        req.session.regenerate((err) => {
            if (err) return res.status(500).json({ message: 'Server Error' });
            // Remember who is logged in. GET /api/me and every apiLoggedIn check read this.
            req.session.user = sessionUser(foundUser);
            // Reply with the safe user object.
            res.json({ user: req.session.user });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/logout: end the session.
// POST /api/logout
exports.apiLogout = (req, res) => {
    // Destroy the session on the server.
    req.session.destroy(() => {
        // Clear the cookie in the browser.
        res.clearCookie('connect.sid');
        // The Vue NavBar also clears the comparison shortlist after this call.
        res.json({ user: null });
    });
};
