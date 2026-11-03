// ACTIVE: model for user accounts. Used by controllers/user-controller.js. Exports the model itself, not a set of helper functions.
const mongoose = require('mongoose');
const { NEED_IDS, NEED_LEVELS, DISTANCE_LEVELS, DEFAULT_PREFERENCES } = require('../lib/preferences');

// Schema: the fields of each user.
const userSchema = new mongoose.Schema({
    // The login name must be unique, trimmed and at least 5 characters.
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 5
    },
    // Email must be unique and is stored in lower case.
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim:true
    },
    // Password field. The controller stores a hash here, never the plain text.
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    // School is a list so a student can have up to two.
    school: {
        type: [String],
        required: true,
        // Custom check: reject more than two schools.
        validate: {
            validator: function(arr) {
                return arr.length <= 2;
            },
            message: 'You can only select up to 2 schools'
        }
    },
    // Role decides what the user can do: Admin gets the admin pages.
    role:{
        type: String,
        required: true
    },
    // Study preferences from the profile page, used to rank spots. Missing on older accounts (lib/preferences.js fills defaults).
    preferences: {
        needs: Object.fromEntries(NEED_IDS.map(id => [id, { type: String, enum: NEED_LEVELS, default: DEFAULT_PREFERENCES.needs[id] }])),
        distance: { type: String, enum: DISTANCE_LEVELS, default: DEFAULT_PREFERENCES.distance },
        seats: { type: Number, default: DEFAULT_PREFERENCES.seats },
    },
    // Sign-up date, set automatically.
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Register the model: name User, collection users (Mongoose default).
const User = mongoose.model('User', userSchema);

// Export the model.
module.exports = User;