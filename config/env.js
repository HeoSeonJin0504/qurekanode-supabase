import "dotenv/config";

// 필수 환경 변수 검증
const required = [
  "DATABASE_URL",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "OPENAI_API_KEY",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[CONFIG] 필수 환경 변수 누락: ${missing.join(", ")}`);
  process.exit(1);
}

// JWT secret 최소 길이 경고
['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'].forEach((key) => {
  if (process.env[key] && process.env[key].length < 32) {
    console.warn(`[CONFIG] 경고: ${key}는 32자 이상을 권장합니다.`);
  }
});

// 설정 객체
const config = {
  // DB
  db: {
    url: process.env.DATABASE_URL,
  },

  // JWT
  jwt: {
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "8000", 10),
  },

  // 서버
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    backendUrl: process.env.BACKEND_URL || "http://localhost:3000",
    testUserId: process.env.TEST_USERID || null,
  },

  // CORS
  cors: {
    // 복수 도메인은 콤마로 구분: https://a.com,https://b.com
    allowedOrigins: (process.env.FRONTEND_URL || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    allowAllOrigins: process.env.ALLOW_ALL_ORIGINS === "true",
  },
};

export default config;