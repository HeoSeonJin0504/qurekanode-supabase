import winston from 'winston';
import fs from 'fs';
import path from 'path';

const logDir = 'logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) =>
    `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log'), maxsize: 5242880, maxFiles: 5 }),
  ],
});

// production 포함 항상 콘솔 출력
logger.add(new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), logFormat),
}));

logger.transaction = (message, meta = {}) => logger.log('info', message, { transaction: true, ...meta });

const enhancedLogger = {
  error: (message, meta = {}) => {
    if (meta instanceof Error) meta = { message: meta.message, stack: meta.stack, ...meta };
    logger.error(message, meta);
  },
  warn:        (message, meta = {}) => logger.warn(message, meta),
  info:        (message, meta = {}) => logger.info(message, meta),
  http:        (message, meta = {}) => logger.http(message, meta),
  debug:       (message, meta = {}) => logger.debug(message, meta),
  transaction: (message, meta = {}) => logger.transaction(message, meta),
};

export default enhancedLogger;