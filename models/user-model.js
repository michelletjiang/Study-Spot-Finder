const mongoose = require('mongoose');

// This schema is the database contract for accounts. Validation here complements the
// controller checks, while enum prevents roles outside the two supported values.
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 5
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim:true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    school: {
        type: [String],
        required: true,
        validate: {
            validator: function(arr) {
                return arr.length <= 2;
            },
            message: 'You can only select up to 2 schools'
        }
    },
    // Registration never trusts a client-supplied role; Student is also the model default.
    role:{
        type: String,
        enum: ['Student', 'Admin'],
        default: 'Student',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;