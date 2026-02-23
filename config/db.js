import pg from 'pg';
import config from './env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.db.url,
  ssl: config.server.isProduction ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('PostgreSQL Pool 오류: ' + err.message);
});

// SQL 쿼리를 실행하고 실행 시간을 로깅
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    logger.debug(`쿼리 실행 [${Date.now() - start}ms]: ${text.slice(0, 80)}`);
    return result;
  } catch (err) {
    logger.error(`쿼리 오류: ${err.message} | SQL: ${text.slice(0, 80)}`);
    throw err;
  }
}

// 트랜잭션으로 콜백을 실행하고 실패 시 롤백
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// DB 연결 상태 확인
export async function checkConnection() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export { pool };