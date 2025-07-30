const jwt = require('jsonwebtoken');
const { extractToken } = require('../utils/tokenUtil');
const logger = require('../utils/logger');

/**
 * 액세스 토큰 검증 미들웨어
 */
const verifyToken = (req, res, next) => {
  const token = extractToken(req, 'accessToken');
  
  if (!token) {
    logger.debug('인증 토큰 없음');
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 필요합니다.'
    });
  }
  
  try {
    // 토큰 검증
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    
    // 자동 로그인 상태 로그
    logger.debug(`토큰 검증 성공 - 사용자: ${decoded.userid}, 자동 로그인: ${decoded.rememberMe ? '사용' : '미사용'}`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug(`토큰 만료 - ${req.path}`);
      return res.status(401).json({
        success: false,
        message: '토큰이 만료되었습니다.',
        expired: true
      });
    }
    
    logger.debug(`유효하지 않은 토큰 - ${error.name}`);
    return res.status(403).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }
};

module.exports = { verifyToken };
