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

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 로깅 미들웨어
app.use((req, res, next) => {
    logger.info(req.method + ' ' + req.path);
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

// API 라우트 (준비되면 추가)
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);

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
    // 로그 중복 제거: console.log 대신 logger만 사용
    logger.info(`서버가 ${PORT} 포트에서 실행 중입니다.`);
    
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
