const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('./logger');
const Token = require('../models/tokenModel');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * 액세스 토큰 생성
 * @param {Object} payload - 토큰에 포함될 정보
 * @returns {string} 생성된 JWT 토큰
 */
const generateAccessToken = (payload) => {
  try {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  } catch (error) {
    logger.error('액세스 토큰 생성 오류: ' + error.message);
    throw new Error('Failed to generate access token');
  }
};

/**
 * 리프레시 토큰 생성
 * @param {Object} payload - 토큰에 포함될 정보
 * @returns {string} 생성된 JWT 토큰
 */
const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  } catch (error) {
    logger.error('리프레시 토큰 생성 오류: ' + error.message);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * 리프레시 토큰 저장
 * @param {number} userId - 사용자 ID
 * @param {string} refreshToken - 리프레시 토큰
 * @returns {Object} 저장 결과
 */
const saveRefreshToken = async (userId, refreshToken) => {
  try {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일
    
    return await Token.saveRefreshToken(userId, hashedToken, expiresAt);
  } catch (error) {
    logger.error('리프레시 토큰 저장 오류: ' + error.message);
    throw error;
  }
};

/**
 * 리프레시 토큰 검증
 * @param {string} refreshToken - 검증할 리프레시 토큰
 * @returns {Object|null} 검증된 페이로드 또는 null
 */
const verifyRefreshToken = async (refreshToken) => {
  try {
    // JWT 검증
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    
    // DB에서 토큰 존재 여부 확인
    const tokenRecord = await Token.findRefreshToken(refreshToken);
    if (!tokenRecord) {
      return null;
    }
    
    // 만료 시간 확인
    if (new Date() > new Date(tokenRecord.expires_at)) {
      await Token.deleteRefreshTokenByToken(refreshToken);
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.error('리프레시 토큰 검증 오류: ' + error.message);
    return null;
  }
};

/**
 * 요청에서 토큰 추출
 * @param {Object} req - 요청 객체
 * @param {string} tokenType - 토큰 유형 ('accessToken' 또는 'refreshToken')
 * @returns {string|null} 추출된 토큰 또는 null
 */
const extractToken = (req, tokenType) => {
  // 1. Authorization 헤더에서 추출 시도
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  
  // 2. 요청 본문에서 추출 시도
  if (req.body && req.body[tokenType]) {
    return req.body[tokenType];
  }
  
  // 3. 쿠키에서 추출 시도
  if (req.cookies && req.cookies[tokenType]) {
    return req.cookies[tokenType];
  }
  
  return null;
};

/**
 * 토큰을 쿠키에 설정
 * @param {Object} res - 응답 객체
 * @param {string} accessToken - 액세스 토큰
 * @param {string} refreshToken - 리프레시 토큰
 * @param {boolean} rememberMe - 자동 로그인 옵션
 */
const setTokenCookies = (res, accessToken, refreshToken, rememberMe = false) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 액세스 토큰 쿠키 설정 (짧은 유효기간)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000, // 1시간
    path: '/'
  });
  
  // 리프레시 토큰 쿠키 설정 (긴 유효기간)
  const refreshMaxAge = rememberMe 
    ? 30 * 24 * 60 * 60 * 1000  // 30일 (자동 로그인)
    : 7 * 24 * 60 * 60 * 1000;  // 7일 (일반 로그인)
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: refreshMaxAge,
    path: '/'
  });
  
  // 자동 로그인 여부 설정 (클라이언트 접근 가능)
  res.cookie('rememberMe', rememberMe, {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: refreshMaxAge,
    path: '/'
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
  extractToken,
  setTokenCookies
};
