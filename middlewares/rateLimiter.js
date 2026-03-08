import rateLimit from 'express-rate-limit';

/**
 * [공통 IP 키 생성기]
 * express-rate-limit v7에서 ipKeyGenerator가 제거됨에 따라 req.ip를 직접 반환하는 함수로 대체
 */
const ipKeyGenerator = (req) => req.ip;

/**
 * [공통 에러 응답 핸들러]
 * 429 Too Many Requests 응답을 일관되게 반환
 */
const makeHandler = (message) => (req, res) => {
  res.status(429).json({ 
    success: false, 
    message 
  });
};

/**
 * [회원가입 리미터]
 * 15분당 최대 5회
 */
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  handler: makeHandler('회원가입 시도 횟수가 초과되었습니다. 15분 후 다시 시도해주세요.'),
});

/**
 * [로그인 리미터]
 * 15분당 최대 5회
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  handler: makeHandler('로그인 시도 횟수가 초과되었습니다. 15분 후 다시 시도해주세요.'),
});

/**
 * [AI 생성 리미터 (요약 / 문제 생성)]
 * 30분당 최대 10회
 */
export const aiGenerationLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  handler: makeHandler('AI 생성 요청 횟수가 초과되었습니다. 1시간 후 다시 시도해주세요.'),
});

/**
 * [저장 리미터 (요약/문제 저장)]
 * 10분당 최대 10회
 */
export const saveLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  handler: makeHandler('저장 요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.'),
});

/**
 * [일반 API 리미터]
 * 15분당 최대 120회
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  handler: makeHandler('요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.'),
});

/**
 * [토큰 갱신 리미터]
 * 15분당 최대 30회
 */
export const tokenRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  handler: makeHandler('토큰 갱신 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'),
});