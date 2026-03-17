import User from '../models/userModel.js';
import Token from '../models/tokenModel.js';
import jwt from 'jsonwebtoken';
import { generateAccessToken, verifyRefreshToken, extractToken } from '../utils/tokenUtil.js';
import logger from '../utils/logger.js';

const getIp = (req) => {
  const raw = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  return raw?.replace(/^::ffff:/, '') || raw;
};

const authController = {
  // 리프레시 토큰으로 새 액세스 토큰 발급
  async refreshToken(req, res) {
    try {
      const refreshToken = extractToken(req, 'refreshToken');
      if (!refreshToken) return res.status(400).json({ success: false, message: '리프레시 토큰이 제공되지 않았습니다.' });

      const payload = await verifyRefreshToken(refreshToken);
      if (!payload) {
        res.clearCookie('accessToken'); res.clearCookie('refreshToken');
        return res.status(401).json({ success: false, message: '유효하지 않거나 만료된 리프레시 토큰입니다.' });
      }

      const user = await User.findByUserid(payload.userid);
      if (!user) {
        res.clearCookie('accessToken'); res.clearCookie('refreshToken');
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
      }

      const userInfo    = { id: user.userindex, userid: user.userid, name: user.name };
      const accessToken = generateAccessToken(userInfo);
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('accessToken', accessToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: 60 * 60 * 1000, path: '/' });

      return res.status(200).json({ success: true, message: '액세스 토큰이 갱신되었습니다.', accessToken, user: userInfo });
    } catch (error) {
      logger.error('토큰 갱신 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 리프레시 토큰 삭제 및 쿠키 초기화
  async logout(req, res) {
    try {
      const refreshToken = extractToken(req, 'refreshToken');

      // refreshToken에서 사용자 정보 직접 디코딩 (req.user 없는 경우 대비)
      let username = '알 수 없음';
      if (refreshToken) {
        try {
          const decoded = jwt.decode(refreshToken);
          username = decoded?.userid || '알 수 없음';
        } catch (_) {}
      }

      const userId = req.user?.id;
      if (refreshToken) {
        await Token.deleteRefreshTokenByToken(refreshToken);
      } else if (userId) {
        await Token.deleteRefreshToken(userId);
      }

      const isProduction  = process.env.NODE_ENV === 'production';
      const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', path: '/' };
      res.clearCookie('accessToken',  cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
      res.clearCookie('rememberMe',   { ...cookieOptions, httpOnly: false });

      const ip = getIp(req);
      logger.info(`[qureka] 로그아웃 성공 - 사용자: ${username}, IP: ${ip}`);
      return res.status(200).json({ success: true, message: '로그아웃 되었습니다.' });
    } catch (error) {
      logger.error('로그아웃 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },
};

export default authController;