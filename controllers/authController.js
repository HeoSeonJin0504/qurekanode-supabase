const User = require('../models/userModel');
const Token = require('../models/tokenModel');
const { 
  generateAccessToken, 
  verifyRefreshToken,
  extractToken
} = require('../utils/tokenUtil');
const logger = require('../utils/logger');

// 인증 컨트롤러
const authController = {
  /**
   * 토큰 갱신
   */
  async refreshToken(req, res) {
    try {
      // 다양한 소스에서 리프레시 토큰 추출
      const refreshToken = extractToken(req, 'refreshToken');
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: '리프레시 토큰이 제공되지 않았습니다.'
        });
      }
      
      // 리프레시 토큰 검증
      const payload = await verifyRefreshToken(refreshToken);
      
      if (!payload) {
        // 쿠키 제거
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        
        logger.debug('유효하지 않은 리프레시 토큰');
        return res.status(401).json({
          success: false,
          message: '유효하지 않거나 만료된 리프레시 토큰입니다.'
        });
      }
      
      // 사용자 정보 조회
      const user = await User.findByUserid(payload.userid);
      
      if (!user) {
        // 쿠키 제거
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        
        logger.warn(`토큰 갱신 실패 - 존재하지 않는 사용자: ${payload.userid}`);
        return res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        });
      }
      
      // 새로운 액세스 토큰 생성
      const userInfo = {
        id: user.userindex,
        userid: user.userid,
        name: user.name
      };
      
      const accessToken = generateAccessToken(userInfo);
      logger.debug(`토큰 갱신 성공 - 사용자: ${user.userid}`);
      
      // 새 액세스 토큰을 쿠키에 설정
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 60 * 60 * 1000, // 1시간
        path: '/'
      });
      
      return res.status(200).json({
        success: true,
        message: '액세스 토큰이 갱신되었습니다.',
        accessToken: accessToken,
        user: {
          id: user.userindex,
          userid: user.userid,
          name: user.name
        }
      });
    } catch (error) {
      logger.error('토큰 갱신 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 로그아웃 처리
   */
  async logout(req, res) {
    try {
      // 다양한 소스에서 리프레시 토큰 추출
      const refreshToken = extractToken(req, 'refreshToken');
      
      // 사용자 정보 추출
      const userId = req.user?.id;
      const username = req.user?.userid || '알 수 없음';
      
      // DB에서 토큰 삭제
      if (refreshToken) {
        await Token.deleteRefreshTokenByToken(refreshToken);
        logger.debug(`리프레시 토큰 삭제 완료 - 사용자: ${username}`);
      } else if (userId) {
        // 토큰이 없고 사용자 ID가 있으면 해당 사용자의 모든 토큰 삭제
        await Token.deleteRefreshToken(userId);
        logger.debug(`사용자 ID로 토큰 삭제 완료 - 사용자 ID: ${userId}`);
      }
      
      // 쿠키 제거 옵션
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/'
      };
      
      // 모든 인증 관련 쿠키 제거
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
      res.clearCookie('rememberMe', {
        ...cookieOptions, 
        httpOnly: false // rememberMe는 httpOnly가 아님
      });
      
      logger.info(`로그아웃 성공 - 사용자: ${username}`);
      return res.status(200).json({
        success: true,
        message: '로그아웃 되었습니다.'
      });
    } catch (error) {
      logger.error('로그아웃 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
};

module.exports = authController;
