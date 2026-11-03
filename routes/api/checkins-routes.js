const express = require('express');

const checkinController = require('../../controllers/checkin-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

router.get('/', checkinController.apiCounts);                            // public: ?spots=id1,id2 -> people checked in
router.get('/me', auth.apiLoggedIn, checkinController.apiMine);          // where am I checked in?
router.delete('/me', auth.apiLoggedIn, checkinController.apiCheckOut);   // check out
router.get('/:spotId/pattern', checkinController.apiPattern);            // public: busiest times
router.post('/:spotId', auth.apiLoggedIn, checkinController.apiCheckIn); // check in here

module.exports = router;
