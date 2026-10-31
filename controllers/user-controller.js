// MIXED file: lines 5 to 211 are LEGACY EJS handlers used only by routes/user-routes.js. The "JSON API" section from line 213 is ACTIVE and used by routes/api/auth-routes.js and profile-routes.js.
// User model: the users collection.
const User = require('../models/user-model');
// AdminRequest model: shows a user's request to become an admin.
const AdminRequest = require('../models/admin-request-model');
// bcrypt hashes passwords, so the database never holds the real password.
const bcrypt = require('bcrypt');

// LEGACY - not used by the Vue demo: shows the EJS register form.
exports.registerGet = (req, res) => {
    res.render('register', {session: req.session, error: []});
};

// LEGACY - not used by the Vue demo: handles the register form post.
exports.registerPost = async (req, res) => {
    try {
        // Read and tidy the form fields.
        const username = req.body.username.trim();
        const email = req.body.email.trim().toLowerCase();
        const ogpassword = req.body.password.trim();
        // Schools arrive as one value or a list, so make it a list.
        const school = req.body.school || [];
        const selectedSchools = Array.isArray(school) ? school : [school];
        // New accounts are always Students.
        const role = 'Student';

        // Collect validation messages here.
        let errors=[];

        //username
        // Username checks.
        if (!username || username === '') {
            errors.push('Username is required.');
        } else if (username.length < 5) {
            errors.push('Username must be at least 5 characters.');
        }
        
        //email
        // Email checks (simple, and it rejects some valid addresses, which the JSON version fixes).
        const atPosition = email.indexOf('@');
        const dotPosition = email.indexOf('.');
        if (!email || email === ''){
            errors.push('Email is required.');
        } else if (!email.includes('@') || !email.includes('.') || atPosition>dotPosition || atPosition===0 ||dotPosition===email.length-1){
            errors.push('Please enter a valid email address.');
        }

        // Password checks.
        //password
        if (!ogpassword || ogpassword === '') {
            errors.push('Password is required.');
        } else if (ogpassword.length < 8) {
            errors.push('Password must be at least 8 characters.');
        }

        // School checks.
        //school
        if (!selectedSchools || selectedSchools.length===0){
            errors.push('School is required.');
        } else if (selectedSchools.length > 2){
            errors.push('Please select the correct schools.')
        }

        // Re-show the form if anything failed.
        if (errors.length>0) {
            return res.render('register', {session: req.session, error: errors});
        }

        // Check that the username and email are not already used.
        //existing user with same user OR email
        const existingUsername = await User.findOne({username});
        const existingEmail = await User.findOne({email});

        if (existingUsername) {
            errors.push("Username already taken.");
        }
        if (existingEmail) {
            errors.push("Email already registered.");
        }

        if(errors.length > 0) {
            return res.render('register', {session: req.session, error: errors});
        }
        // Hash the password with 10 rounds.
        const password = await bcrypt.hash(ogpassword, 10);
        
        // Save the user.
        await User.create({username, email, password, school: selectedSchools, role});
        // Go to the legacy login page.
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        res.render('register', {session: req.session, error: ["Registration failed, please try again."]});
    }
};

// LEGACY - not used by the Vue demo: shows the EJS login form.
exports.loginGet = (req, res) => {
    res.render('login', {session: req.session, error: []});
};

// LEGACY - not used by the Vue demo: handles the login form post.
exports.loginPost = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        // Both fields are required.
        if (!email || !password) {
            return res.render ('login', {session: req.session, error: ["Email or Password cannot be empty"]});
        }
        // Find the user by email.
        const foundUser = await User.findOne({email});
        // Existing bug: foundUser.password is read before checking foundUser exists, so an unknown email would throw. The JSON login below checks first.
        const match = await bcrypt.compare(password, foundUser.password);   
        // Wrong email or password shows one generic message.
        if (!foundUser || !match) {
            return res.render ('login', {session: req.session, error: ["Invalid email or password"]});
        }

        // Save the user in the session. This is what auth middleware reads later.
        req.session.user = {
            id: foundUser._id,
            username: foundUser.username,
            email: foundUser.email,
            school: foundUser.school,
            role: foundUser.role,
            createdAt: foundUser.createdAt
        };

        // Redirect to the legacy home page.
        res.redirect('/');

    } catch (error) {
        console.error(error);
        // Any error becomes a plain 500 response.
        res.status(500).send("Server Error");
    }
};

// LEGACY - not used by the Vue demo: legacy profile page.
exports.profile = async (req, res) => {
    // Load the user from the database.
    const dbUser = await User.findById(req.session.user.id);
    // Existing note below: keep the session role in sync with the database.
    // Sync role from DB in case an admin approved this user since last login
    if (dbUser.role !== req.session.user.role) {
        req.session.user.role = dbUser.role;
    }
    // Admins are sent to their own legacy page.
    if (dbUser.role === 'Admin') {
        return res.redirect('/admin-profile');
    }
    // Latest admin request of this user, if any.
    const adminRequest = await AdminRequest.findOne({ userId: req.session.user.id }).sort({ createdAt: -1 });
    // Render views/profile.ejs.
    res.render('profile', {session: req.session, user: req.session.user, adminRequest});
};

// LEGACY - not used by the Vue demo: legacy admin profile page with pending requests.
exports.adminProfile = async (req, res) => {
    // Oldest pending request first.
    const pendingRequests = await AdminRequest.find({ status: 'Pending' }).sort({ createdAt: 1 });
    res.render('admin-profile', {session: req.session, user: req.session.user, pendingRequests});
}

// LEGACY - not used by the Vue demo: shows the edit profile form.
exports.editProfileGet = async (req, res) => {
    const user = await User.findById(req.session.user.id);
    res.render('edit-profile', {session: req.session, user, error: []});
};

// LEGACY - not used by the Vue demo: saves the edit profile form.
exports.editProfilePost = async (req, res) => {
    try {
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        let errors = [];

        // Check that the new username and email are not used by someone else.
        const existingUsername = await User.findOne({username});
        const existingEmail = await User.findOne({email});

        if (existingUsername && existingUsername._id.toString() !== req.session.user.id.toString()) {
            errors.push("Username already taken.");
        }
        if (existingEmail && existingEmail._id.toString() !== req.session.user.id.toString()) {
            errors.push("Email already registered.");
        }
        
        // A new password is optional but must be 8 characters or more.
        if (password && password !== '' && password.length < 8) {
            errors.push("Password must be at least 8 characters.");
        }

        // Re-show the form if anything failed.
        if (errors.length > 0) {
            return res.render('edit-profile', {session: req.session, user: req.body, error: errors});
        }

        // Load the user and apply the changes.
        const user = await User.findById(req.session.user.id);
        user.username = username;
        user.email = email;

        // Hash a new password only when one was given.
        if (password && password.length >= 8) {

            user.password = await bcrypt.hash(password, 10);
        }
        // Save to the database.
        await user.save();

        // Keep the session in step.
        req.session.user.username = user.username;
        req.session.user.email = user.email;
        res.redirect('/profile');

    } catch (error) {
        console.error(error);
        res.redirect('/edit-profile');
    }
};

// LEGACY - not used by the Vue demo: no route uses goToFavourites. The comment above it is an old reminder.
//NEED TO CHECK ROUTE NAMES
// Redirect to the legacy favourites page when logged in.
exports.goToFavourites = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.redirect('/favourites');
};

//NEED TO CHECK ROUTE NAMES
// LEGACY - not used by the Vue demo: only redirects a logged-out user. A logged-in user gets no response from it.
exports.goToReviews = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
};

// LEGACY - not used by the Vue demo: logs out by destroying the session and redirecting to the EJS login.
exports.logout = (req, res) => {
    // Destroy the server-side session.
    req.session.destroy(() => {
        res.redirect('/login');
    });
}

// LEGACY - not used by the Vue demo: deletes the account and ends the session.
exports.deleteUser = async (req, res) => {
    try {
        await User.deleteOne({_id: req.session.user.id});
        req.session.destroy();
        res.redirect('/');
    } catch (error) {
        res.send('Error deleting account');
    }
}

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
        user.username = username;
        user.email = email;
        // A blank password keeps the old one.
        if (password) user.password = await bcrypt.hash(password, 10);
        // Save to the database.
        await user.save();

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
