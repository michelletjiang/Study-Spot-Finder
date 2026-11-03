const express = require('express');

const noiseController = require('../../controllers/noise-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

router.get('/heatmap', noiseController.apiGetHeatmap);              // public: must stay above /:id
router.get('/:id', noiseController.apiGetNoise);                    // public: current noise level for a spot
router.post('/:id', auth.apiLoggedIn, noiseController.apiReport);   // body: { status }. Checked in to this spot only

module.exports = router;
