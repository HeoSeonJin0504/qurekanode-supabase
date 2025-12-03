const User = require('../models/userModel');
const Favorite = require('../models/favoriteModel');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  saveRefreshToken,
  setTokenCookies
} = require('../utils/tokenUtil');
const logger = require('../utils/logger');
const registrationLock = require('../utils/requestLock');
const {
  isValidUserid,
  isValidPassword,
  isValidName,
  isValidPhone,
  isValidEmail,
  isValidAge,
  isValidGender,
  isSafeSqlInput
} = require('../utils/validation');

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
    const { userid, password, name, age, gender, phone, email } = req.body;
    
    try {
      // 필수 입력값 검증
      if (!userid || !password || !name || !age || !gender || !phone) {
        return res.status(400).json({
          success: false,
          message: '필수 입력값이 누락되었습니다. (아이디, 비밀번호, 이름, 나이, 성별, 전화번호는 필수입니다.)'
        });
      }
      
      // SQL Injection 방어: 입력값 안전성 검사
      if (!isSafeSqlInput(userid) || !isSafeSqlInput(name) || 
          !isSafeSqlInput(phone) || (email && !isSafeSqlInput(email))) {
        logger.warn(`SQL Injection 시도 감지 - IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          message: '입력값에 허용되지 않는 문자가 포함되어 있습니다.'
        });
      }
      
      // 입력값 형식 검증
      if (!isValidUserid(userid)) {
        return res.status(400).json({
          success: false,
          message: '아이디는 4-20자의 영문, 숫자, 언더스코어만 사용 가능합니다.'
        });
      }
      
      if (!isValidPassword(password)) {
        return res.status(400).json({
          success: false,
          message: '비밀번호는 8자 이상이며, 영문과 숫자를 포함해야 합니다.'
        });
      }
      
      if (!isValidName(name)) {
        return res.status(400).json({
          success: false,
          message: '이름은 2-50자의 한글 또는 영문만 사용 가능합니다.'
        });
      }
      
      if (!isValidAge(age)) {
        return res.status(400).json({
          success: false,
          message: '나이는 1-150 사이의 숫자여야 합니다.'
        });
      }
      
      if (!isValidGender(gender)) {
        return res.status(400).json({
          success: false,
          message: '성별은 M 또는 F만 가능합니다.'
        });
      }
      
      if (!isValidPhone(phone)) {
        return res.status(400).json({
          success: false,
          message: '전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)'
        });
      }
      
      if (email && !isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: '이메일 형식이 올바르지 않습니다.'
        });
      }
      
      // 동시 요청 방지: userid로 잠금 시도
      if (!registrationLock.acquire(userid)) {
        logger.warn(`중복 회원가입 요청 차단 - userid: ${userid}`);
        return res.status(429).json({
          success: false,
          message: '회원가입 처리 중입니다. 잠시 후 다시 시도해주세요.'
        });
      }
      
      // 아이디 중복 확인
      const existingUser = await User.findByUserid(userid);
      
      if (existingUser) {
        registrationLock.release(userid);
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
      
      // 회원가입 성공 후 기본 폴더 생성
      try {
        await Favorite.createDefaultFolder(newUser.userindex);
        logger.info(`기본 폴더 생성 완료 - 사용자 ID: ${newUser.userindex}`);
      } catch (folderError) {
        // 기본 폴더 생성 실패는 로그만 남기고 회원가입은 성공 처리
        logger.error('기본 폴더 생성 실패:', folderError);
      }
      
      // 잠금 해제
      registrationLock.release(userid);
      
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
      // 오류 발생 시 반드시 잠금 해제
      registrationLock.release(userid);
      
      logger.error('회원가입 오류:', error);
      
      // Supabase(PostgreSQL) 중복 키 오류 처리 (에러 코드: 23505)
      if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
        let message = '이미 등록된 정보입니다.';
        
        // PostgreSQL 에러 메시지 또는 MySQL 에러 메시지에서 필드명 확인
        const errorMessage = error.message || error.sqlMessage || '';
        
        if (errorMessage.includes('phone') || errorMessage.includes('전화번호')) {
          message = '이미 등록된 전화번호입니다.';
        } else if (errorMessage.includes('email') || errorMessage.includes('이메일')) {
          message = '이미 등록된 이메일입니다.';
        } else if (errorMessage.includes('userid') || errorMessage.includes('아이디')) {
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
      const { userid, password, rememberMe = false } = req.body;
      
      // 필수 입력값 검증
      if (!userid || !password) {
        return res.status(400).json({
          success: false,
          message: '아이디와 비밀번호를 모두 입력해주세요.'
        });
      }
      
      // SQL Injection 방어
      if (!isSafeSqlInput(userid)) {
        logger.warn(`로그인 SQL Injection 시도 감지 - IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          message: '입력값에 허용되지 않는 문자가 포함되어 있습니다.'
        });
      }
      
      // 입력값 형식 검증
      if (!isValidUserid(userid)) {
        return res.status(400).json({
          success: false,
          message: '아이디 형식이 올바르지 않습니다.'
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
