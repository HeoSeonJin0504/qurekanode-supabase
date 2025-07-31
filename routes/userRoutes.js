const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');

// 공개 라우트
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/check-userid', userController.checkUserid);

// 인증 필요 라우트 (예시)
// router.get('/profile', verifyToken, userController.getProfile);

module.exports = router;
