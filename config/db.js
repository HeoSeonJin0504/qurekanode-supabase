import pg from 'pg';
import config from './env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

// Supabase PostgreSQL Pool
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

/**
 * SQL 쿼리 실행
 * @param {string} text - SQL 문
 * @param {Array}  params - 파라미터 배열
 * @returns {Promise<pg.QueryResult>}
 */
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

/**
 * 트랜잭션 실행
 * @param {Function} callback - (client) => Promise<any>
 */
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

/**
 * DB 연결 상태 확인
 * @returns {Promise<boolean>}
 */
export async function checkConnection() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export { pool };