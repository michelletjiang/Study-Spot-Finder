const User = require('../models/user-model');
const AdminRequest = require('../models/admin-request-model');
const bcrypt = require('bcrypt');

exports.registerGet = (req, res) => {
    res.render('register', {session: req.session, error: []});
};

exports.registerPost = async (req, res) => {
    try {
        const username = req.body.username.trim();
        const email = req.body.email.trim().toLowerCase();
        const ogpassword = req.body.password.trim();
        const school = req.body.school || [];
        const selectedSchools = Array.isArray(school) ? school : [school];
        const role = 'Student';

        let errors=[];

        //username
        if (!username || username === '') {
            errors.push('Username is required.');
        } else if (username.length < 5) {
            errors.push('Username must be at least 5 characters.');
        }
        
        //email
        const atPosition = email.indexOf('@');
        const dotPosition = email.indexOf('.');
        if (!email || email === ''){
            errors.push('Email is required.');
        } else if (!email.includes('@') || !email.includes('.') || atPosition>dotPosition || atPosition===0 ||dotPosition===email.length-1){
            errors.push('Please enter a valid email address.');
        }

        //password
        if (!ogpassword || ogpassword === '') {
            errors.push('Password is required.');
        } else if (ogpassword.length < 8) {
            errors.push('Password must be at least 8 characters.');
        }

        //school
        if (!selectedSchools || selectedSchools.length===0){
            errors.push('School is required.');
        } else if (selectedSchools.length > 2){
            errors.push('Please select the correct schools.')
        }

        if (errors.length>0) {
            return res.render('register', {session: req.session, error: errors});
        }

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
        const password = await bcrypt.hash(ogpassword, 10);
        
        await User.create({username, email, password, school: selectedSchools, role});
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        res.render('register', {session: req.session, error: ["Registration failed, please try again."]});
    }
};

exports.loginGet = (req, res) => {
    res.render('login', {session: req.session, error: []});
};

exports.loginPost = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        if (!email || !password) {
            return res.render ('login', {session: req.session, error: ["Email or Password cannot be empty"]});
        }
        const foundUser = await User.findOne({email});
        const match = await bcrypt.compare(password, foundUser.password);   
        if (!foundUser || !match) {
            return res.render ('login', {session: req.session, error: ["Invalid email or password"]});
        }

        req.session.user = {
            id: foundUser._id,
            username: foundUser.username,
            email: foundUser.email,
            school: foundUser.school,
            role: foundUser.role,
            createdAt: foundUser.createdAt
        };

        res.redirect('/');

    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};

exports.profile = async (req, res) => {
    const dbUser = await User.findById(req.session.user.id);
    // Sync role from DB in case an admin approved this user since last login
    if (dbUser.role !== req.session.user.role) {
        req.session.user.role = dbUser.role;
    }
    if (dbUser.role === 'Admin') {
        return res.redirect('/admin-profile');
    }
    const adminRequest = await AdminRequest.findOne({ userId: req.session.user.id }).sort({ createdAt: -1 });
    res.render('profile', {session: req.session, user: req.session.user, adminRequest});
};

exports.adminProfile = async (req, res) => {
    const pendingRequests = await AdminRequest.find({ status: 'Pending' }).sort({ createdAt: 1 });
    res.render('admin-profile', {session: req.session, user: req.session.user, pendingRequests});
}

exports.editProfileGet = async (req, res) => {
    const user = await User.findById(req.session.user.id);
    res.render('edit-profile', {session: req.session, user, error: []});
};

exports.editProfilePost = async (req, res) => {
    try {
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        let errors = [];

        const existingUsername = await User.findOne({username});
        const existingEmail = await User.findOne({email});

        if (existingUsername && existingUsername._id.toString() !== req.session.user.id.toString()) {
            errors.push("Username already taken.");
        }
        if (existingEmail && existingEmail._id.toString() !== req.session.user.id.toString()) {
            errors.push("Email already registered.");
        }
        
        if (password && password !== '' && password.length < 8) {
            errors.push("Password must be at least 8 characters.");
        }

        if (errors.length > 0) {
            return res.render('edit-profile', {session: req.session, user: req.body, error: errors});
        }

        const user = await User.findById(req.session.user.id);
        user.username = username;
        user.email = email;

        if (password && password.length >= 8) {

            user.password = await bcrypt.hash(password, 10);
        }
        await user.save();

        req.session.user.username = user.username;
        req.session.user.email = user.email;
        res.redirect('/profile');

    } catch (error) {
        console.error(error);
        res.redirect('/edit-profile');
    }
};

//NEED TO CHECK ROUTE NAMES
exports.goToFavourites = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.redirect('/favourites');
};

//NEED TO CHECK ROUTE NAMES
exports.goToReviews = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
}

exports.deleteUser = async (req, res) => {
    try {
        await User.deleteOne({_id: req.session.user.id});
        req.session.destroy();
        res.redirect('/');
    } catch (error) {
        res.send('Error deleting account');
    }
}

// ---------- JSON API (used by Vue) ----------

const SCHOOLS = ['LKCSB', 'SCIS', 'SOSS', 'SOA', 'SOE', 'YPHSL', 'CIS'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // the old check rejected emails like john.doe@smu.edu.sg

// what the session (and /api/me) keeps about a user - never the password hash
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

// POST /api/register   body: { username, email, password, school: [codes] }
exports.apiRegister = async (req, res) => {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const school = Array.isArray(req.body.school) ? req.body.school : [];

    const errors = [];
    if (!username) errors.push('Username is required.');
    else if (username.length < 5) errors.push('Username must be at least 5 characters.');
    if (!email) errors.push('Email is required.');
    else if (!EMAIL_PATTERN.test(email)) errors.push('Please enter a valid email address.');
    if (!password) errors.push('Password is required.');
    else if (password.length < 8) errors.push('Password must be at least 8 characters.');
    if (school.length === 0) errors.push('School is required.');
    else if (school.length > 2 || !school.every(s => SCHOOLS.includes(s))) errors.push('Please select the correct schools.');
    if (errors.length > 0) return res.status(400).json({ message: errors.join(' '), errors });

    try {
        if (await User.findOne({ username })) errors.push('Username already taken.');
        if (await User.findOne({ email })) errors.push('Email already registered.');
        if (errors.length > 0) return res.status(409).json({ message: errors.join(' '), errors });

        await User.create({ username, email, password: await bcrypt.hash(password, 10), school, role: 'Student' });
        res.status(201).json({ message: 'Account created. Please log in.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Registration failed, please try again.' });
    }
};

// GET /api/profile -> { user, adminRequest }
exports.apiGetProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) return res.status(401).json({ message: 'Account no longer exists' });
        // sync role from DB in case an admin approved this user since last login
        req.session.user = sessionUser(user);
        const adminRequest = await AdminRequest.findOne({ userId: user._id }).sort({ createdAt: -1 });
        res.json({ user: req.session.user, adminRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error loading profile' });
    }
};

// PUT /api/profile   body: { username, email, password? }  (blank password = keep the current one)
exports.apiUpdateProfile = async (req, res) => {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const myId = req.session.user.id.toString();

    const errors = [];
    if (username.length < 5) errors.push('Username must be at least 5 characters.');
    if (!EMAIL_PATTERN.test(email)) errors.push('Please enter a valid email address.');
    if (password && password.length < 8) errors.push('Password must be at least 8 characters.');
    if (errors.length > 0) return res.status(400).json({ message: errors.join(' '), errors });

    try {
        const existingUsername = await User.findOne({ username });
        const existingEmail = await User.findOne({ email });
        if (existingUsername && existingUsername._id.toString() !== myId) errors.push('Username already taken.');
        if (existingEmail && existingEmail._id.toString() !== myId) errors.push('Email already registered.');
        if (errors.length > 0) return res.status(409).json({ message: errors.join(' '), errors });

        const user = await User.findById(myId);
        if (!user) return res.status(401).json({ message: 'Account no longer exists' });
        user.username = username;
        user.email = email;
        if (password) user.password = await bcrypt.hash(password, 10);
        await user.save();

        req.session.user = sessionUser(user);
        res.json({ user: req.session.user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

// DELETE /api/profile
exports.apiDeleteAccount = async (req, res) => {
    try {
        await User.deleteOne({ _id: req.session.user.id });
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.status(204).end();
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting account' });
    }
};

// POST /api/login   body: { email, password }
exports.apiLogin = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase(); // register lowercases, so login must too
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Email or Password cannot be empty' });

    try {
        const foundUser = await User.findOne({ email });
        // check foundUser BEFORE reading .password (the old loginPost crashes here)
        if (!foundUser || !(await bcrypt.compare(password, foundUser.password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // new session ID on login, so an old/stolen ID can't be reused
        req.session.regenerate((err) => {
            if (err) return res.status(500).json({ message: 'Server Error' });
            req.session.user = sessionUser(foundUser);
            res.json({ user: req.session.user });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/logout
exports.apiLogout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ user: null });
    });
};
