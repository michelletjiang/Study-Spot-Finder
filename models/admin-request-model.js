const mongoose = require('mongoose');

const adminRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "Pending",
        enum: ["Pending", "Approved", "Denied"]
    }
},
{
    timestamps: true
});

const AdminRequest = mongoose.model('AdminRequest', adminRequestSchema, 'adminrequests');

AdminRequest.addRequest = function(newRequest) {
    return AdminRequest.create(newRequest);
};

AdminRequest.updateRequestStatus = function(_id, status) {
    return AdminRequest.updateOne(
        { _id: _id },
        { status: status }
    );
};

AdminRequest.deleteByUser = function(userId) {
    return AdminRequest.deleteMany({ userId: userId });
};

module.exports = AdminRequest;
