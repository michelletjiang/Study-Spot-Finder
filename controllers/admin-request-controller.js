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
