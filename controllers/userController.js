const User = require('../models/userModel');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  saveRefreshToken,
  setTokenCookies
} = require('../utils/tokenUtil');
const logger = require('../utils/logger');

// 사용자 컨트롤러
const userController = {
  /**
   * 아이디 중복 확인
   */
  async checkUserid(req, res) {
    try {
      const { userid } = req.body;
      
      if (!userid) {
        return res.status(400).json({
          success: false,
          message: '아이디가 제공되지 않았습니다.'
        });
      }
      
      // 사용자 아이디로 조회
      const existingUser = await User.findByUserid(userid);
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 아이디입니다.'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: '사용 가능한 아이디입니다.'
      });
    } catch (error) {
      logger.error('아이디 중복 확인 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 회원가입 처리
   */
  async register(req, res) {
    try {
      const { userid, password, name, age, gender, phone, email } = req.body;
      
      // 필수 입력값 검증
      if (!userid || !password || !name || !age || !gender || !phone) {
        return res.status(400).json({
          success: false,
          message: '필수 입력값이 누락되었습니다. (아이디, 비밀번호, 이름, 나이, 성별, 전화번호는 필수입니다.)'
        });
      }
      
      // 아이디 중복 확인
      const existingUser = await User.findByUserid(userid);
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 아이디입니다.'
        });
      }
      
      // 사용자 생성
      const newUser = await User.create({ 
        userid, 
        password, 
        name, 
        age, 
        gender, 
        phone, 
        email 
      });
      
      return res.status(201).json({
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: {
          id: newUser.userindex,
          userid: newUser.userid,
          name: newUser.name,
          email: newUser.email
        }
      });
    } catch (error) {
      logger.error('회원가입 오류:', error);
      
      // 중복 키 오류 처리
      if (error.code === 'ER_DUP_ENTRY') {
        let message = '이미 등록된 정보입니다.';
        if (error.sqlMessage.includes('phone')) {
          message = '이미 등록된 전화번호입니다.';
        } else if (error.sqlMessage.includes('email')) {
          message = '이미 등록된 이메일입니다.';
        } else if (error.sqlMessage.includes('userid')) {
          message = '이미 등록된 아이디입니다.';
        }
        
        return res.status(409).json({
          success: false,
          message: message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 로그인 처리
   */
  async login(req, res) {
    try {
      // userid, password와 함께 rememberMe 옵션을 받음
      const { userid, password, rememberMe = false } = req.body;
      
      // 필수 입력값 검증
      if (!userid || !password) {
        return res.status(400).json({
          success: false,
          message: '아이디와 비밀번호를 모두 입력해주세요.'
        });
      }
      
      // 인증 시도
      const user = await User.authenticate(userid, password);
      
      if (!user) {
        logger.debug(`로그인 실패 - 사용자: ${userid}`);
        return res.status(401).json({
          success: false,
          message: '아이디 또는 비밀번호가 일치하지 않습니다.'
        });
      }
      
      logger.info(`로그인 성공 - 사용자: ${user.userid}, 자동로그인: ${rememberMe ? '사용' : '미사용'}`);
      
      // 사용자 ID가 제대로 있는지 확인
      if (user.userindex === undefined || user.userindex === null) {
        logger.error('유효하지 않은 사용자 ID', { userid: user.userid });
        return res.status(500).json({
          success: false,
          message: '사용자 ID 정보가 올바르지 않습니다.'
        });
      }
      
      // 토큰에 담을 사용자 정보
      const userInfo = {
        id: user.userindex,
        userid: user.userid,
        name: user.name,
        rememberMe // 자동 로그인 정보 추가
      };
      
      // 액세스 토큰 및 리프레시 토큰 생성
      const accessToken = generateAccessToken(userInfo);
      const refreshToken = generateRefreshToken(userInfo);
      
      try {
        // 리프레시 토큰 저장
        await saveRefreshToken(user.userindex, refreshToken);
        
        // 토큰을 쿠키와 응답 본문에 모두 전달 (자동 로그인 옵션 포함)
        setTokenCookies(res, accessToken, refreshToken, rememberMe);
        
      } catch (tokenError) {
        logger.error('리프레시 토큰 저장 실패:', tokenError);
        return res.status(500).json({
          success: false,
          message: '로그인은 성공했으나 토큰 저장 중 오류가 발생했습니다.'
        });
      }
      
      // 로그인 성공 응답
      logger.transaction('사용자 로그인', { 
        userid: user.userid, 
        rememberMe: rememberMe 
      });
      
      return res.status(200).json({
        success: true,
        message: '로그인 성공',
        user: {
          id: user.userindex,
          userid: user.userid,
          name: user.name,
          email: user.email
        },
        tokens: {
          accessToken,
          refreshToken
        },
        rememberMe // 응답에 자동 로그인 정보 포함
      });
    } catch (error) {
      logger.error('로그인 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
};

module.exports = userController;
