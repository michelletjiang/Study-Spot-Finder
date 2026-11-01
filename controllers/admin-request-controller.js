// MIXED file: requestAdmin and processRequest (lines 4 to 51) are LEGACY EJS handlers used by routes/admin-request-routes.js. The "JSON API" section below is ACTIVE.
// The model for admin requests.
const AdminRequest = require('../models/admin-request-model');
// The user model, to change a user's role.
const User = require('../models/user-model');

// LEGACY - not used by the Vue demo: a student asks to become admin, then is redirected to the old profile page.
exports.requestAdmin = async (req, res) => {
    try {
        // The session user was saved at login.
        const userId = req.session.user.id;
        const username = req.session.user.username;

        // Don't create a duplicate pending request
        // Look for an existing Pending request.
        const existing = await AdminRequest.findOne({ userId, status: 'Pending' });
        // Already pending: do nothing.
        if (existing) {
            return res.redirect('/profile');
        }

        // Build the request document.
        const newRequest = {
            userId: userId,
            username: username,
            status: 'Pending'
        };
        console.log(newRequest);
        // Save it.
        await AdminRequest.addRequest(newRequest);
        // Redirect to the legacy profile page.
        res.redirect('/profile');
    } catch (error) {
        // Errors become a plain-text message.
        console.log(error);
        res.send("Error submitting admin request");
    }
};

// LEGACY - not used by the Vue demo: admin approves or denies a request from an HTML form.
exports.processRequest = async (req, res) => {
    try {
        // The hidden form field has the request id.
        const requestId = req.body.requestId;
        // The action is the button pressed.
        const action = req.body.action;
        // Load the request.
        const adminRequest = await AdminRequest.findById(requestId);

        // Missing request: plain-text message.
        if (!adminRequest) {
            return res.send("Request not found");
        }

        // Approve: mark the request and give the user the Admin role.
        if (action == 'approve') {
            await AdminRequest.updateRequestStatus(requestId, 'Approved');
            await User.findByIdAndUpdate(adminRequest.userId, { role: 'Admin' });
        // Deny: only mark the request.
        } else if (action == 'deny') {
            await AdminRequest.updateRequestStatus(requestId, 'Denied');
        }

        // Redirect back to the legacy admin profile.
        res.redirect('/admin-profile');
    } catch (error) {
        console.log(error);
        res.send("Error processing admin request");
    }
};

// ACTIVE: JSON handlers used by routes/api/admin-requests-routes.js.
// ---------- JSON API (used by Vue) ----------

// Used to validate ids in the JSON handlers.
const mongoose = require('mongoose');

// POST /api/admin-requests: the logged-in user asks to become admin.
// POST /api/admin-requests   (the logged-in user asks to become admin)
exports.apiRequestAdmin = async (req, res) => {
    try {
        // An admin cannot ask again: 400.
        if (req.session.user.role === 'Admin') return res.status(400).json({ message: 'You are already an admin' });

        // Existing guard for the duplicate case.
        // Don't create a duplicate pending request
        const existing = await AdminRequest.findOne({ userId: req.session.user.id, status: 'Pending' });
        // A second pending request gets 409, which means a conflict.
        if (existing) return res.status(409).json({ message: 'You already have a pending request' });

        // Create the request.
        const adminRequest = await AdminRequest.addRequest({
            userId: req.session.user.id,
            username: req.session.user.username,
            status: 'Pending'
        });
        // 201 means created.
        res.status(201).json(adminRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting admin request' });
    }
};

// GET /api/admin-requests (admin): oldest pending first.
// GET /api/admin-requests   (admin: pending requests, oldest first)
exports.apiListPendingRequests = async (req, res) => {
    try {
        // Query the pending ones and sort by creation time.
        res.json(await AdminRequest.find({ status: 'Pending' }).sort({ createdAt: 1 }));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error loading admin requests' });
    }
};

// Existing comment: one function serves both approve and deny.
// shared by approve/deny
// status is Approved or Denied.
async function resolveRequest(req, res, status) {
    // A bad id is a 404.
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Request not found' });
    try {
        // Load the request.
        const adminRequest = await AdminRequest.findById(req.params.id);
        if (!adminRequest) return res.status(404).json({ message: 'Request not found' });
        // A request that was already handled returns 409.
        if (adminRequest.status !== 'Pending') return res.status(409).json({ message: `Request was already ${adminRequest.status.toLowerCase()}` });

        // Update the status.
        await AdminRequest.updateRequestStatus(adminRequest._id, status);
        // Approval also promotes the user to Admin.
        if (status === 'Approved') await User.findByIdAndUpdate(adminRequest.userId, { role: 'Admin' });
        // Return the request with its new status.
        res.json({ ...adminRequest.toObject(), status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing admin request' });
    }
}

// Approve and deny routes call the shared function with a different status.
// POST /api/admin-requests/:id/approve  and  /:id/deny
exports.apiApproveRequest = (req, res) => resolveRequest(req, res, 'Approved');
exports.apiDenyRequest = (req, res) => resolveRequest(req, res, 'Denied');
