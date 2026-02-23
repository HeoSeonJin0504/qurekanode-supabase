import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { extractToken } from '../utils/tokenUtil.js';
import logger from '../utils/logger.js';

/**
 * 액세스 토큰 검증 미들웨어
 */
export const verifyToken = (req, res, next) => {
  const token = extractToken(req, 'accessToken');

  if (!token) {
    logger.debug('인증 토큰 없음');
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    req.user = decoded;
    logger.debug(`토큰 검증 성공 - 사용자: ${decoded.userid}`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug(`토큰 만료 - ${req.path}`);
      return res.status(401).json({ success: false, message: '토큰이 만료되었습니다.', expired: true });
    }
    logger.debug(`유효하지 않은 토큰 - ${error.name}`);
    return res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
};