const express = require('express');
const router = express.Router();
const alertController = require('../../controllers/studyspot-alert-controller');
const auth = require('../../middleware/auth-middleware');

router.get('/', alertController.apiGetAlertsForSpots);          // ?spots=id1,id2 (floor plan)
router.get('/spot/:spotId', alertController.apiGetAlerts);
router.post('/spot/:spotId', auth.apiLoggedIn, alertController.apiCreateAlert);
router.post('/:alertId/vote', auth.apiLoggedIn, alertController.apiVoteAlert);
router.patch('/:alertId/resolve', auth.apiLoggedIn, alertController.apiResolveAlert);

module.exports = router;