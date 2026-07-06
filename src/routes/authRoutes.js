// /api/auth 路由
const express = require('express');
const authController = require('../controllers/authController');
const { apiAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', apiAuth, authController.me);

module.exports = router;
