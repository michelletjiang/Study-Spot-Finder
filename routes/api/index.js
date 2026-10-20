const express = require('express');

const router = express.Router();

// JSON API used by the Vue client. Add one router file per feature in this folder
// and mount it here, e.g.
//   router.use('/spots', require('./spots-routes'));
//   router.use('/buildings', require('./buildings-routes'));

router.use('/buildings', require('./buildings-routes'));
router.use('/', require('./auth-routes'));   // → /api/login, /api/logout


// Any /api path that no router handled gets a JSON 404 instead of falling through to the EJS routes
router.use((req, res) => {
    res.status(404).json({ message: `No API route for ${req.method} ${req.originalUrl}` });
});

module.exports = router;
