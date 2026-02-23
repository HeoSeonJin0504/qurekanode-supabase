// SQL 인젝션 및 XSS 패턴 차단 검사
export const isSafeSqlInput = (value) => {
  if (typeof value !== 'string') return true;
  const sqlPatterns = [
    /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|SCRIPT|IFRAME)/i,
    /(\-\-|\/\*|\*\/|xp_|sp_)/,
    /(\bOR\b.*=|1\s*=\s*1)/i,
    /(<script|<iframe|javascript:|onerror=|onload=)/i,
  ];
  return !sqlPatterns.some((p) => p.test(value));
};

// 아이디 내 SQL 인젝션 패턴 검사
export const isSafeUserid = (userid) => {
  if (typeof userid !== 'string') return false;
  const dangerousPatterns = [
    /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|DECLARE)/i,
    /(\-\-|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b)/i,
  ];
  return !dangerousPatterns.some((p) => p.test(userid));
};

// 비밀번호 내 위험한 SQL/스크립트 패턴 검사
export const isSafePassword = (password) => {
  if (typeof password !== 'string') return false;
  const dangerousPatterns = [
    /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)/i,
    /(<script|<iframe|javascript:|onerror=|onload=)/i,
  ];
  return !dangerousPatterns.some((p) => p.test(password));
};

// 아이디 형식 검증 (5~20자 영소문자·숫자·-_)
export const isValidUserid = (userid) => {
  if (!userid || typeof userid !== 'string') return false;
  return /^[a-z0-9_-]{5,20}$/.test(userid);
};

// 비밀번호 길이·허용문자·복잡도 검증
export const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 16) return false;
  const allowed = /^[a-zA-Z0-9!"#$%&'()*+,\-.\/\:;?@\[\\\]^_`{|}~]+$/;
  if (!allowed.test(password)) return false;
  const hasLetter  = /[a-zA-Z]/.test(password);
  const hasNumber  = /[0-9]/.test(password);
  const hasSpecial = /[!"#$%&'()*+,\-.\/\:;?@\[\\\]^_`{|}~]/.test(password);
  return [hasLetter, hasNumber, hasSpecial].filter(Boolean).length >= 2;
};

export const isValidName   = (name)   => !!name && typeof name === 'string' && /^[가-힣a-zA-Z\s]{2,50}$/.test(name);
export const isValidPhone  = (phone)  => !!phone && typeof phone === 'string' && /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(phone);
export const isValidEmail  = (email)  => !!email && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 100;
export const isValidAge    = (age)    => { const n = Number(age); return !isNaN(n) && n >= 1 && n <= 150; };
export const isValidGender = (gender) => gender === 'female' || gender === 'male';

// HTML 특수문자 이스케이프 처리
export const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').replace(/\//g,'&#x2F;');
};