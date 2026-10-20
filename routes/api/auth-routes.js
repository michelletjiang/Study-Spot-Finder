const express = require('express');

const userController = require('../../controllers/user-controller');
const router = express.Router();

router.post('/login', userController.apiLogin);
router.post('/logout', userController.apiLogout);

module.exports = router;
