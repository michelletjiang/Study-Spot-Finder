const express = require('express');
const router = express.Router();
const alertController = require('../../controllers/studyspot-alert-controller');
const auth = require('../../middleware/auth-middleware'); // ← copy the exact auth require line from crowd-routes.js

router.get('/spot/:spotId', alertController.apiGetAlerts);
router.post('/spot/:spotId', auth.apiLoggedIn, alertController.apiCreateAlert);
router.post('/:alertId/vote', auth.apiLoggedIn, alertController.apiVoteAlert);
router.patch('/:alertId/resolve', auth.apiLoggedIn, alertController.apiResolveAlert);

module.exports = router;