import rateLimit from 'express-rate-limit';

// 공통 keyGenerator
const keyGenerator = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() ||
  req.ip ||
  req.connection?.remoteAddress ||
  'unknown';

// 공통 에러 응답 핸들러
const makeHandler = (message) => (req, res) => {
  res.status(429).json({ success: false, message });
};

// 회원가입
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15분
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: makeHandler('회원가입 시도 횟수가 초과되었습니다. 15분 후 다시 시도해주세요.'),
});

// 로그인 리미터
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15분
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: makeHandler('로그인 시도 횟수가 초과되었습니다. 15분 후 다시 시도해주세요.'),
});

// AI 생성 리미터 (요약 / 문제 생성)
export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1시간
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: makeHandler('AI 생성 요청 횟수가 초과되었습니다. 1시간 후 다시 시도해주세요.'),
});

// 저장 리미터 (요약/문제 저장)
export const saveLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,   // 10분
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: makeHandler('저장 요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.'),
});

// 일반 API 리미터
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15분
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: makeHandler('요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.'),
});

// 토큰 갱신 리미터
export const tokenRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15분
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: makeHandler('토큰 갱신 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'),
});