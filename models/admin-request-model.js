// ACTIVE: model for "request to become an admin". A model describes what a MongoDB document looks like and how the app reads and writes it. Used by controllers/admin-request-controller.js.
const mongoose = require('mongoose');

// The schema lists the fields each admin request must have.
const adminRequestSchema = new mongoose.Schema({
    // Which user made the request.
    userId: {
        // ObjectId links this request to a document in the users collection.
        type: mongoose.Schema.Types.ObjectId,
        // ref names the model that the id points to.
        ref: 'User',
        // A request without a user is rejected.
        required: true
    },
    // The requester's name, kept so admins can read it without a second lookup.
    username: {
        type: String,
        required: true
    },
    // Request state: every new request starts as Pending.
    status: {
        type: String,
        default: "Pending",
        // Only these three values are accepted.
        enum: ["Pending", "Approved", "Denied"]
    }
},
// timestamps adds createdAt and updatedAt automatically.
{
    timestamps: true
});

// Register the model: name AdminRequest, schema above, collection "adminrequests".
const AdminRequest = mongoose.model('AdminRequest', adminRequestSchema, 'adminrequests');

// Helper used by the controller to save a new request.
AdminRequest.addRequest = function(newRequest) {
    return AdminRequest.create(newRequest);
};

// Helper that changes the status (Approved or Denied) of one request.
AdminRequest.updateRequestStatus = function(_id, status) {
    return AdminRequest.updateOne(
        { _id: _id },
        { status: status }
    );
};

// Export the model with its helper functions.
module.exports = AdminRequest;
