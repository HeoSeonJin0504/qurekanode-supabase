const winston = require('winston');
const fs = require('fs');
const path = require('path');

// logs 디렉토리 생성
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// 로깅 포맷 정의
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(function(info) {
        return info.timestamp + ' [' + info.level.toUpperCase() + ']: ' + info.message + 
               (info.stack ? '\n' + info.stack : '');
    })
);

// Winston 로거 생성
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        new winston.transports.File({ 
            filename: path.join(logDir, 'error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5 
        })
    ]
});

// 개발 환경에서만 콘솔 출력 추가 (중복 제거)
if (process.env.NODE_ENV !== 'production') {
    // 이전에 추가된 콘솔 transport 제거 (중복 방지)
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        })
    );
}

// 트랜잭션 로그 특수 처리를 위한 커스텀 로그 함수
logger.transaction = (message, meta = {}) => {
  logger.log('info', message, { transaction: true, ...meta });
};

// 로그 함수 개선 - 인자 유연성 추가
const enhancedLogger = {
  error: (message, meta = {}) => {
    if (meta instanceof Error) {
      meta = { 
        message: meta.message,
        stack: meta.stack,
        ...meta
      };
    }
    logger.error(message, meta);
  },
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  http: (message, meta = {}) => logger.http(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  transaction: (message, meta = {}) => logger.transaction(message, meta)
};

module.exports = enhancedLogger;


module.exports = enhancedLogger;
