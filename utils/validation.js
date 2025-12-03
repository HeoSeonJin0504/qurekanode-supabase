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
  
  // SQL Injection 패턴 검사 (대소문자 구분 없이)
  const sqlPatterns = [
    // SQL 키워드 (단어 경계 제거)
    /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|SCRIPT|IFRAME)/i,
    // SQL 주석 및 위험 패턴 (특수문자는 비밀번호에서 허용되므로 주석 패턴만)
    /(\-\-|\/\*|\*\/|xp_|sp_)/,
    // SQL 조건문 패턴
    /(\bOR\b.*=|1\s*=\s*1)/i,
    // HTML/Script 태그
    /(<script|<iframe|javascript:|onerror=|onload=)/i
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(value));
};

/**
 * 아이디 전용 SQL Injection 검증 (더 엄격)
 * @param {string} userid - 검증할 아이디
 * @returns {boolean} 안전 여부
 */
const isSafeUserid = (userid) => {
  if (typeof userid !== 'string') return false;
  
  // 아이디는 SQL 키워드 및 주석 패턴 차단
  const dangerousPatterns = [
    /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|DECLARE)/i,
    /(\-\-|\/\*|\*\/)/,  // SQL 주석
    /(\bOR\b|\bAND\b)/i  // 조건문
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(userid));
};

/**
 * 비밀번호 전용 안전성 검증 (덜 엄격)
 * @param {string} password - 검증할 비밀번호
 * @returns {boolean} 안전 여부
 */
const isSafePassword = (password) => {
  if (typeof password !== 'string') return false;
  
  // 비밀번호는 특수문자 허용하되, SQL 키워드와 스크립트만 차단
  const dangerousPatterns = [
    /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)/i,
    /(<script|<iframe|javascript:|onerror=|onload=)/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(password));
};

/**
 * 아이디 형식 검증 (영문 소문자, 숫자, -, _ 만 허용)
 * @param {string} userid - 검증할 아이디
 * @returns {boolean} 유효성
 */
const isValidUserid = (userid) => {
  if (!userid || typeof userid !== 'string') return false;
  
  // 5-20자, 영문 소문자+숫자+하이픈+언더스코어만
  const useridPattern = /^[a-z0-9_-]{5,20}$/;
  return useridPattern.test(userid);
};

/**
 * 비밀번호 형식 검증
 * 8-16자, 영문 대소문자 + 숫자 + 특수문자 조합 권장
 * @param {string} password - 검증할 비밀번호
 * @returns {boolean} 유효성
 */
const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  
  // 길이 제한: 8-16자
  if (password.length < 8 || password.length > 16) {
    return false;
  }
  
  // 허용된 특수문자: ! " # $ % & ' ( ) * + , - . / : ; ? @ [ \ ] ^ _ ` { | } ~
  const allowedSpecialChars = /^[a-zA-Z0-9!"#$%&'()*+,\-.\/:;?@\[\\\]^_`{|}~]+$/;
  if (!allowedSpecialChars.test(password)) {
    return false;
  }
  
  // 영문 포함 여부
  const hasLetter = /[a-zA-Z]/.test(password);
  // 숫자 포함 여부
  const hasNumber = /[0-9]/.test(password);
  // 특수문자 포함 여부
  const hasSpecial = /[!"#$%&'()*+,\-.\/:;?@\[\\\]^_`{|}~]/.test(password);
  
  // 영문 + 숫자 + 특수문자 중 최소 2가지 이상 포함 (권장사항)
  const combinationCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  
  return combinationCount >= 2;
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
  return gender === 'female' || gender === 'male';
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
  isSafeUserid,
  isSafePassword,
  isValidUserid,
  isValidPassword,
  isValidName,
  isValidPhone,
  isValidEmail,
  isValidAge,
  isValidGender,
  sanitizeInput
};
