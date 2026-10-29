const AdminRequest = require('../models/admin-request-model');
const User = require('../models/user-model');

exports.requestAdmin = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const username = req.session.user.username;

        // Don't create a duplicate pending request
        const existing = await AdminRequest.findOne({ userId, status: 'Pending' });
        if (existing) {
            return res.redirect('/profile');
        }

        const newRequest = {
            userId: userId,
            username: username,
            status: 'Pending'
        };
        console.log(newRequest);
        await AdminRequest.addRequest(newRequest);
        res.redirect('/profile');
    } catch (error) {
        console.log(error);
        res.send("Error submitting admin request");
    }
};

exports.processRequest = async (req, res) => {
    try {
        const requestId = req.body.requestId;
        const action = req.body.action;
        const adminRequest = await AdminRequest.findById(requestId);

        if (!adminRequest) {
            return res.send("Request not found");
        }

        if (action == 'approve') {
            await AdminRequest.updateRequestStatus(requestId, 'Approved');
            await User.findByIdAndUpdate(adminRequest.userId, { role: 'Admin' });
        } else if (action == 'deny') {
            await AdminRequest.updateRequestStatus(requestId, 'Denied');
        }

        res.redirect('/admin-profile');
    } catch (error) {
        console.log(error);
        res.send("Error processing admin request");
    }
};

// ---------- JSON API (used by Vue) ----------

const mongoose = require('mongoose');

// POST /api/admin-requests   (the logged-in user asks to become admin)
exports.apiRequestAdmin = async (req, res) => {
    try {
        if (req.session.user.role === 'Admin') return res.status(400).json({ message: 'You are already an admin' });

        // Don't create a duplicate pending request
        const existing = await AdminRequest.findOne({ userId: req.session.user.id, status: 'Pending' });
        if (existing) return res.status(409).json({ message: 'You already have a pending request' });

        const adminRequest = await AdminRequest.addRequest({
            userId: req.session.user.id,
            username: req.session.user.username,
            status: 'Pending'
        });
        res.status(201).json(adminRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting admin request' });
    }
};

// GET /api/admin-requests   (admin: pending requests, oldest first)
exports.apiListPendingRequests = async (req, res) => {
    try {
        res.json(await AdminRequest.find({ status: 'Pending' }).sort({ createdAt: 1 }));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error loading admin requests' });
    }
};

// shared by approve/deny
async function resolveRequest(req, res, status) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Request not found' });
    try {
        const adminRequest = await AdminRequest.findById(req.params.id);
        if (!adminRequest) return res.status(404).json({ message: 'Request not found' });
        if (adminRequest.status !== 'Pending') return res.status(409).json({ message: `Request was already ${adminRequest.status.toLowerCase()}` });

        await AdminRequest.updateRequestStatus(adminRequest._id, status);
        if (status === 'Approved') await User.findByIdAndUpdate(adminRequest.userId, { role: 'Admin' });
        res.json({ ...adminRequest.toObject(), status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing admin request' });
    }
}

// POST /api/admin-requests/:id/approve  and  /:id/deny
exports.apiApproveRequest = (req, res) => resolveRequest(req, res, 'Approved');
exports.apiDenyRequest = (req, res) => resolveRequest(req, res, 'Denied');
