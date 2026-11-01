const express = require('express');

const crowdController = require('../../controllers/crowd-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

router.get('/:id', crowdController.apiGetCrowd);                    // public: current crowd level for a spot
router.post('/:id', auth.apiLoggedIn, crowdController.apiCheckIn);  // body: { status }

module.exports = router;
