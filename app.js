import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

import config from './config/env.js';
import { checkConnection } from './config/db.js';
import { initDb } from './config/initDb.js';
import logger from './utils/logger.js';

import { generalLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';

import apiRouter from './routes/index.js';

const app = express();

// Render 프록시 신뢰 설정
app.set('trust proxy', 1);

// 보안 헤더
app.use(helmet({ crossOriginEmbedderPolicy: false }));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    const { allowedOrigins, allowAllOrigins } = config.cors;
    if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS 차단: ${origin}`);
      callback(new Error('CORS 정책에 의해 차단된 요청'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-retry', 'ngrok-skip-browser-warning'],
}));

// 기본 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 요청 로깅
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// 전역 Rate Limiter
app.use(generalLimiter);

// 기본 경로
app.get('/', (_req, res) => {
  res.json({ message: 'API 서버에 오신 것을 환영합니다!' });
});

// 헬스 체크
app.get('/health', async (_req, res) => {
  const dbConnected = await checkConnection();
  res.json({
    status: dbConnected ? '정상' : '경고',
    timestamp: new Date().toISOString(),
    database: dbConnected ? '연결됨' : '연결 안됨',
  });
});

// API 라우트
app.use('/api', apiRouter);

// 에러 핸들러
app.use(notFoundHandler);
app.use(globalErrorHandler);

// 서버 시작 
const { port } = config.server;

const server = app.listen(port, async () => {
  logger.info(`서버 실행 중 - 포트 ${port} (${config.server.nodeEnv})`);

  const connected = await checkConnection();
  logger.info(`DB ${connected ? '연결됨' : '연결 실패'}`);

  if (connected) {
    // DB 연결 성공 시 테이블 자동 생성
    await initDb();
  }
});

// Graceful Shutdown
const shutdown = (signal) => {
  logger.info(`${signal} 수신 - 서버 종료 중...`);
  server.close(() => {
    logger.info('서버 종료 완료');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  (err) => { logger.error('Uncaught Exception: ' + err.message, err); process.exit(1); });
process.on('unhandledRejection', (reason) => { logger.error('Unhandled Rejection: ' + reason); process.exit(1); });

export default app;