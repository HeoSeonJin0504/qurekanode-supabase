import User from '../models/userModel.js';
import Favorite from '../models/favoriteModel.js';
import { generateAccessToken, generateRefreshToken, saveRefreshToken, setTokenCookies } from '../utils/tokenUtil.js';
import logger from '../utils/logger.js';
import registrationLock from '../utils/requestLock.js';
import { isValidUserid, isValidName, isValidPhone, isValidEmail, isValidAge, isValidGender, isSafeUserid, isSafePassword, isSafeSqlInput } from '../utils/validation.js';

const userController = {
  // 아이디 중복 여부 확인
  async checkUserid(req, res) {
    try {
      const { userid } = req.body;
      if (!userid) return res.status(400).json({ success: false, message: '아이디가 제공되지 않았습니다.' });
      const existingUser = await User.findByUserid(userid);
      if (existingUser) return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
      return res.status(200).json({ success: true, message: '사용 가능한 아이디입니다.' });
    } catch (error) {
      logger.error('아이디 중복 확인 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 입력값 유효성 검증 후 신규 사용자 등록
  async register(req, res) {
    const { userid, password, name, age, gender, phone, email } = req.body;
    try {
      if (!userid || !password || !name || !age || !gender || !phone)
        return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
      if (!isSafeUserid(userid))
        return res.status(400).json({ success: false, message: '아이디에 허용되지 않는 문자가 포함되어 있습니다.' });
      if (!isSafePassword(password))
        return res.status(400).json({ success: false, message: '비밀번호에 허용되지 않는 패턴이 포함되어 있습니다.' });
      if (!isSafeSqlInput(name) || !isSafeSqlInput(phone) || (email && !isSafeSqlInput(email)))
        return res.status(400).json({ success: false, message: '입력값에 허용되지 않는 문자가 포함되어 있습니다.' });
      if (!isValidUserid(userid))
        return res.status(400).json({ success: false, message: '아이디는 5-20자의 영문 소문자, 숫자, -, _만 사용 가능합니다.' });
      if (!isValidName(name))
        return res.status(400).json({ success: false, message: '이름은 2-50자의 한글 또는 영문만 사용 가능합니다.' });
      if (!isValidAge(age))
        return res.status(400).json({ success: false, message: '나이는 1-150 사이의 숫자여야 합니다.' });
      if (!isValidGender(gender))
        return res.status(400).json({ success: false, message: '성별은 female 또는 male만 가능합니다.' });
      if (!isValidPhone(phone))
        return res.status(400).json({ success: false, message: '전화번호 형식이 올바르지 않습니다.' });
      if (email && !isValidEmail(email))
        return res.status(400).json({ success: false, message: '이메일 형식이 올바르지 않습니다.' });

      if (!registrationLock.acquire(userid))
        return res.status(429).json({ success: false, message: '회원가입 처리 중입니다. 잠시 후 다시 시도해주세요.' });

      const existingUser = await User.findByUserid(userid);
      if (existingUser) { registrationLock.release(userid); return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.' }); }

      const newUser = await User.create({ userid, password, name, age, gender, phone, email });
      try { await Favorite.createDefaultFolder(newUser.userindex); } catch (e) { logger.error('기본 폴더 생성 실패:', e); }
      registrationLock.release(userid);

      return res.status(201).json({ success: true, message: '회원가입이 완료되었습니다.', user: { id: newUser.userindex, userid: newUser.userid, name: newUser.name, email: newUser.email } });
    } catch (error) {
      registrationLock.release(userid);
      logger.error('회원가입 오류:', error);
      if (error.code === '23505') {
        const msg = error.message || '';
        let message = '이미 등록된 정보입니다.';
        if (msg.includes('phone')) message = '이미 등록된 전화번호입니다.';
        else if (msg.includes('email')) message = '이미 등록된 이메일입니다.';
        else if (msg.includes('userid')) message = '이미 등록된 아이디입니다.';
        return res.status(409).json({ success: false, message });
      }
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 아이디·비밀번호 인증 및 JWT 토큰 발급
  async login(req, res) {
    try {
      const { userid, password, rememberMe = false } = req.body;
      if (!userid || !password) return res.status(400).json({ success: false, message: '아이디와 비밀번호를 모두 입력해주세요.' });
      if (!isSafeUserid(userid)) return res.status(400).json({ success: false, message: '입력값에 허용되지 않는 문자가 포함되어 있습니다.' });
      if (!isValidUserid(userid)) return res.status(400).json({ success: false, message: '아이디 형식이 올바르지 않습니다.' });

      const user = await User.authenticate(userid, password);
      if (!user) return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
      if (user.userindex == null) return res.status(500).json({ success: false, message: '사용자 ID 정보가 올바르지 않습니다.' });

      const userInfo     = { id: user.userindex, userid: user.userid, name: user.name, rememberMe };
      const accessToken  = generateAccessToken(userInfo);
      const refreshToken = generateRefreshToken(userInfo);

      try {
        await saveRefreshToken(user.userindex, refreshToken);
        setTokenCookies(res, accessToken, refreshToken, rememberMe);
      } catch (tokenError) {
        logger.error('리프레시 토큰 저장 실패:', tokenError);
        return res.status(500).json({ success: false, message: '로그인은 성공했으나 토큰 저장 중 오류가 발생했습니다.' });
      }

      logger.transaction('사용자 로그인', { userid: user.userid, rememberMe });
      return res.status(200).json({ success: true, message: '로그인 성공', user: { id: user.userindex, userid: user.userid, name: user.name, email: user.email }, tokens: { accessToken, refreshToken }, rememberMe });
    } catch (error) {
      logger.error('로그인 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },
};

export default userController;
