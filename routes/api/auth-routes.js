// ACTIVE: register, login and logout JSON routes. routes/api/index.js mounts them at the /api root.
const express = require('express');

// Controller holds apiRegister, apiLogin and apiLogout.
const userController = require('../../controllers/user-controller');
const router = express.Router();

// POST /api/register: create an account. Public on purpose, so no auth guard.
router.post('/register', userController.apiRegister);
// POST /api/login: check email and password and start the session. Public.
router.post('/login', userController.apiLogin);
// POST /api/logout: end the session. The Vue NavBar calls this and also clears the comparison shortlist.
router.post('/logout', userController.apiLogout);

// Export for routes/api/index.js.
module.exports = router;
