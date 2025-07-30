const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger'); // logger 모듈 추가

// 토큰 갱신 API
router.post('/refresh-token', authController.refreshToken);

// 로그아웃 API - 선택적 토큰 검증
// 유효한 토큰이 있으면 사용자 정보와 함께, 없으면 없이 로그아웃
router.post('/logout', (req, res, next) => {
  // 토큰 검증을 시도하되, 실패해도 다음 단계로 진행
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = decoded;
    } catch (error) {
      // 토큰이 유효하지 않아도 로그아웃은 계속 진행
      logger.debug('로그아웃 처리 중 - 유효하지 않은 토큰');
    }
  }
  next();
}, authController.logout);

// 토큰 검증 API
router.get('/verify', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: '토큰이 유효합니다.',
    user: {
      id: req.user.id,
      userid: req.user.userid,
      name: req.user.name,
      rememberMe: req.user.rememberMe || false
    }
  });
});

module.exports = router;
