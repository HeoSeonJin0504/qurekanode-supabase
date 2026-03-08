import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from './logger.js';
import Token from '../models/tokenModel.js';
import config from '../config/env.js'; // dotenv 로드 보장 + 검증 완료된 값 사용

// JWT 액세스 토큰 생성
export const generateAccessToken = (payload) => {
  try {
    return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessExpiresIn });
  } catch (error) {
    logger.error('액세스 토큰 생성 오류: ' + error.message);
    throw new Error('Failed to generate access token');
  }
};

// JWT 리프레시 토큰 생성
export const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  } catch (error) {
    logger.error('리프레시 토큰 생성 오류: ' + error.message);
    throw new Error('Failed to generate refresh token');
  }
};

// 리프레시 토큰을 bcrypt 해싱하여 DB에 저장
export const saveRefreshToken = async (userId, refreshToken) => {
  try {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return await Token.saveRefreshToken(userId, hashedToken, expiresAt);
  } catch (error) {
    logger.error('리프레시 토큰 저장 오류: ' + error.message);
    throw error;
  }
};

// 리프레시 토큰 서명 검증 및 DB 유효성 확인
export const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded     = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const tokenRecord = await Token.findRefreshToken(refreshToken);
    if (!tokenRecord) return null;
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

// Authorization 헤더·body·쿠키 순으로 토큰 추출
export const extractToken = (req, tokenType) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
  if (req.body?.[tokenType])    return req.body[tokenType];
  if (req.cookies?.[tokenType]) return req.cookies[tokenType];
  return null;
};

// 액세스·리프레시 토큰을 HttpOnly 쿠키로 설정
export const setTokenCookies = (res, accessToken, refreshToken, rememberMe = false) => {
  const isProduction  = config.server.isProduction;
  const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const base = { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', path: '/' };

  res.cookie('accessToken',  accessToken,  { ...base, maxAge: 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...base, maxAge: refreshMaxAge });
  res.cookie('rememberMe',   rememberMe,   { ...base, httpOnly: false, maxAge: refreshMaxAge });
};