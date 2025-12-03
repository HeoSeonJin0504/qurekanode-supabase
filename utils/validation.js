/**
 * 입력값 검증 유틸리티
 */

/**
 * SQL Injection 위험 문자 검증
 * @param {string} value - 검증할 값
 * @returns {boolean} 안전 여부
 */
const isSafeSqlInput = (value) => {
  if (typeof value !== 'string') return true;
  
  // SQL Injection 패턴 검사
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
    /(;|\-\-|\/\*|\*\/|xp_|sp_)/i,
    /(\bOR\b.*=.*|1=1|'=')/i
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(value));
};

/**
 * 아이디 형식 검증 (영문, 숫자, 언더스코어만 허용)
 * @param {string} userid - 검증할 아이디
 * @returns {boolean} 유효성
 */
const isValidUserid = (userid) => {
  if (!userid || typeof userid !== 'string') return false;
  
  // 4-20자, 영문+숫자+언더스코어만
  const useridPattern = /^[a-zA-Z0-9_]{4,20}$/;
  return useridPattern.test(userid);
};

/**
 * 비밀번호 형식 검증
 * @param {string} password - 검증할 비밀번호
 * @returns {boolean} 유효성
 */
const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  
  // 8-50자, 최소 1개의 영문+숫자 포함
  return password.length >= 8 && 
         password.length <= 50 &&
         /[a-zA-Z]/.test(password) &&
         /[0-9]/.test(password);
};

/**
 * 이름 형식 검증
 * @param {string} name - 검증할 이름
 * @returns {boolean} 유효성
 */
const isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;
  
  // 2-50자, 한글/영문/공백만
  const namePattern = /^[가-힣a-zA-Z\s]{2,50}$/;
  return namePattern.test(name);
};

/**
 * 전화번호 형식 검증
 * @param {string} phone - 검증할 전화번호
 * @returns {boolean} 유효성
 */
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  // 010-1234-5678 또는 01012345678 형식
  const phonePattern = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phonePattern.test(phone);
};

/**
 * 이메일 형식 검증
 * @param {string} email - 검증할 이메일
 * @returns {boolean} 유효성
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email) && email.length <= 100;
};

/**
 * 나이 범위 검증
 * @param {number} age - 검증할 나이
 * @returns {boolean} 유효성
 */
const isValidAge = (age) => {
  const ageNum = Number(age);
  return !isNaN(ageNum) && ageNum >= 1 && ageNum <= 150;
};

/**
 * 성별 검증
 * @param {string} gender - 검증할 성별
 * @returns {boolean} 유효성
 */
const isValidGender = (gender) => {
  return gender === 'M' || gender === 'F';
};

/**
 * XSS 위험 문자 제거
 * @param {string} value - 정제할 값
 * @returns {string} 정제된 값
 */
const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

module.exports = {
  isSafeSqlInput,
  isValidUserid,
  isValidPassword,
  isValidName,
  isValidPhone,
  isValidEmail,
  isValidAge,
  isValidGender,
  sanitizeInput
};
