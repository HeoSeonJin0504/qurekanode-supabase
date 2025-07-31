require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const logger = require('./utils/logger');
const { checkConnection } = require('./config/db');

// 환경 변수 확인
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    logger.error('필수 환경 변수가 없습니다: SUPABASE_URL 또는 SUPABASE_KEY');
    process.exit(1);
}

// Express 앱 초기화
const app = express();

// CORS 옵션 구성
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    
    const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === 'true';
    if (!origin || allowedOrigins.includes(origin) || allowAllOrigins) {
      callback(null, true);
    } else {
      logger.warn(`CORS 차단: ${origin}`);
      callback(new Error('CORS 정책에 의해 차단된 요청'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning']
};

// CORS 미들웨어 적용
app.use(cors(corsOptions));

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 로깅 미들웨어
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// 기본 경로
app.get('/', (req, res) => {
    res.json({ message: 'Qureka API에 오신 것을 환영합니다!' });
});

// 헬스 체크 경로
app.get('/health', async (req, res) => {
    try {
        const dbConnected = await checkConnection();
        let userData = null;
        
        // 데이터베이스가 연결된 경우에만 사용자 정보 확인
        if (dbConnected) {
            const { supabase } = require('./config/db');
            const { data, error } = await supabase
                .from('users')
                .select('name')
                .eq('userindex', 1)
                .single();
                
            if (!error && data) {
                userData = {
                    userIndex: 1,
                    name: data.name
                };
            }
        }
        
        res.json({ 
            status: '정상', 
            timestamp: new Date().toISOString(),
            database: dbConnected ? '연결됨' : '연결 안됨',
            userData: userData
        });
    } catch (error) {
        res.json({ 
            status: '경고', 
            timestamp: new Date().toISOString(),
            database: '오류',
            message: error.message
        });
    }
});

// API 라우트 설정
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const summaryRoutes = require('./routes/summaryRoutes');
const questionRoutes = require('./routes/questionRoutes');
const problemSummaryMetaRoutes = require('./routes/problemSummaryMeta');

// API 라우트 (중복 제거하고 통합)
const apiRoutes = [
  { path: '/users', router: userRoutes },
  { path: '/auth', router: authRoutes },
  { path: '/summaries', router: summaryRoutes },
  { path: '/questions', router: questionRoutes },
  { path: '/problem-summary-meta', router: problemSummaryMetaRoutes }
];

// API 라우트 등록 (API 접두사 있는 버전과 없는 버전 모두 지원)
apiRoutes.forEach(route => {
  if (route.router) { // 라우터가 있는 경우에만 등록
    app.use(`/api${route.path}`, route.router);
    app.use(route.path, route.router);
  }
});

// 404 핸들러
app.use('*', (req, res) => {
    res.status(404).json({ error: '요청하신 경로를 찾을 수 없습니다' });
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ 
        error: '서버에 오류가 발생했습니다!', 
        message: err.message || '내부 서버 오류' 
    });
});

// 서버 시작
const server = app.listen(PORT, () => {
    logger.info(`서버가 ${PORT} 포트에서 실행 중입니다.`);
    logger.info(`API 서버 URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
  
    // 개발 환경에서만 허용된 CORS 도메인 출력 
    if (process.env.NODE_ENV !== 'production') {
        logger.info(`CORS 허용 도메인: ${process.env.FRONTEND_URL || '모든 도메인 허용'}`);
    }
    
    // 데이터베이스 연결 확인 (비동기적으로 수행)
    checkConnection()
        .then(async connected => {
            if (connected) {
                try {
                    const { supabase } = require('./config/db');
                    const { data, error } = await supabase
                        .from('users')
                        .select('name')
                        .eq('userindex', 1)
                        .single();
                    
                    const currentTime = new Date().toLocaleTimeString('ko-KR');
                    
                    if (error) {
                        logger.info(`데이터베이스 연결됨 [${currentTime}] - 사용자 정보 없음: ${error.message}`);
                    } else if (data) {
                        logger.info(`데이터베이스 연결됨 [${currentTime}] - 사용자: ${data.name}`);
                    } else {
                        logger.info(`데이터베이스 연결됨 [${currentTime}] - 사용자 ID 1 없음`);
                    }
                } catch (err) {
                    const currentTime = new Date().toLocaleTimeString('ko-KR');
                    logger.info(`데이터베이스 연결됨 [${currentTime}] - 조회 오류: ${err.message}`);
                }
            } else {
                const currentTime = new Date().toLocaleTimeString('ko-KR');
                logger.warn(`데이터베이스 연결 실패 [${currentTime}] - 제한된 기능으로 실행`);
            }
        })
        .catch(err => {
            const currentTime = new Date().toLocaleTimeString('ko-KR');
            logger.error(`데이터베이스 연결 오류 [${currentTime}]: ${err.message}`);
        });
});

// 프로세스 종료 처리
process.on('SIGTERM', () => {
    logger.info('SIGTERM 신호 받음. 서버를 종료합니다.');
    server.close(() => {
        logger.info('서버가 종료되었습니다.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT 신호 받음. 서버를 종료합니다.');
    server.close(() => {
        logger.info('서버가 종료되었습니다.');
        process.exit(0);
    });
});

module.exports = app;
