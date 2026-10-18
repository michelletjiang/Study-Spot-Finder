const User = require('../models/user-model');
const AdminRequest = require('../models/admin-request-model');
const Review = require('../models/reviews-model');
const Report = require('../models/reports');
const Favourite = require('../models/favourites-model');
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
        // check the user exists BEFORE touching foundUser.password
        if (!foundUser || !await bcrypt.compare(password, foundUser.password)) {
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
    if (!dbUser) {
        return req.session.destroy(() => res.redirect('/login'));
    }
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
            return res.render('edit-profile', {session: req.session, user: {...req.session.user, username, email}, error: errors});
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
    res.redirect('/reviews/' + req.session.user.username);
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
}

exports.deleteUser = async (req, res) => {
    try {
        const username = req.session.user.username;

        // clear the user's own data so nothing is left attributed to a dead account
        const reviews = await Review.findbyUser(username);
        await Report.deleteByReviews(reviews.map(r => r._id));
        await Review.deleteByUser(username);
        await Favourite.deleteByUser(username);
        await AdminRequest.deleteByUser(req.session.user.id);

        await User.deleteOne({_id: req.session.user.id});
        req.session.destroy(() => res.redirect('/'));
    } catch (error) {
        console.error(error);
        res.send('Error deleting account');
    }
}