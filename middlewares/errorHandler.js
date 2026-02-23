import logger from '../utils/logger.js';

// 404 핸들러 
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: '요청하신 경로를 찾을 수 없습니다.',
    path: req.originalUrl,
  });
}
 
// 전역 에러 핸들러
// eslint-disable-next-line no-unused-vars
export function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // 로그 레벨 분기
  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${req.method} ${req.path} - ${err.message}`, err);
  } else {
    logger.warn(`[${statusCode}] ${req.method} ${req.path} - ${err.message}`);
  }

  // CORS 에러
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS 정책에 의해 차단된 요청입니다.',
    });
  }

  // JWT 에러
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: '토큰이 만료되었습니다.', expired: true });
  }

  // 유효성 에러
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  // 일반 에러
  res.status(statusCode).json({
    success: false,
    message: isProduction ? '서버 오류가 발생했습니다.' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

// AppError 클래스
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}