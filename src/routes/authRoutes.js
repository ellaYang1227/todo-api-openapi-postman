// /api/auth 路由
const express = require('express');
const authController = require('../controllers/authController');
const { apiAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { RegisterRequestSchema, LoginRequestSchema } = require('../openapi/schemas');

const router = express.Router();

router.post('/register', validate(RegisterRequestSchema), authController.register);
router.post('/login', validate(LoginRequestSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', apiAuth, authController.me);

module.exports = router;
