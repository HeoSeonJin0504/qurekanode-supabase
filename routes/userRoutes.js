const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiting 설정 (회원가입 전용)
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // IP당 5회 제한 (테스트시 수정)
  message: { 
    success: false, 
    message: '너무 많은 회원가입 시도가 있었습니다. 15분 후에 다시 시도해주세요.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // IP 주소를 키로 사용
    return req.ip || req.connection.remoteAddress;
  }
});

// 공개 라우트
router.post('/register', registrationLimiter, userController.register);
router.post('/login', userController.login);
router.post('/check-userid', userController.checkUserid);

// 인증 필요 라우트 (예시)
// router.get('/profile', verifyToken, userController.getProfile);

module.exports = router;
