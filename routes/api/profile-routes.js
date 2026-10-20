const express = require('express');

const userController = require('../../controllers/user-controller');
const auth = require('../../middleware/auth-middleware');
const router = express.Router();

router.get('/', auth.apiLoggedIn, userController.apiGetProfile);
router.put('/', auth.apiLoggedIn, userController.apiUpdateProfile);
router.delete('/', auth.apiLoggedIn, userController.apiDeleteAccount);

module.exports = router;
