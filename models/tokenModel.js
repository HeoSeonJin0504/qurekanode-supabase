import { query } from '../config/db.js';
import bcrypt from 'bcryptjs';

class Token {
  // 기존 토큰 삭제 후 새 리프레시 토큰 저장
  static async saveRefreshToken(userId, hashedToken, expiresAt) {
    try {
      if (!userId)      throw new Error('사용자 ID가 필요합니다.');
      if (!hashedToken) throw new Error('토큰 값이 필요합니다.');
      if (!expiresAt)   throw new Error('만료 시간이 필요합니다.');

      await this.deleteRefreshToken(userId);

      const { rows } = await query(
        `INSERT INTO refresh_token (user_id, token, expires_at)
         VALUES ($1, $2, $3) RETURNING *`,
        [userId, hashedToken, expiresAt.toISOString()]
      );
      return rows[0];
    } catch (error) {
      console.error('리프레시 토큰 저장 오류:', error.message);
      throw error;
    }
  }

  // bcrypt 비교로 리프레시 토큰 검색
  static async findRefreshToken(plainToken) {
    try {
      const { rows } = await query('SELECT * FROM refresh_token');
      for (const row of rows) {
        if (await bcrypt.compare(plainToken, row.token)) return row;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  // 사용자 ID로 리프레시 토큰 삭제
  static async deleteRefreshToken(userId) {
    try {
      if (!userId) throw new Error('사용자 ID가 필요합니다.');
      await query('DELETE FROM refresh_token WHERE user_id = $1', [userId]);
      return true;
    } catch (error) {
      console.error('리프레시 토큰 삭제 오류:', error);
      throw error;
    }
  }

  // 토큰 값으로 리프레시 토큰 삭제
  static async deleteRefreshTokenByToken(plainToken) {
    try {
      const tokenRecord = await this.findRefreshToken(plainToken);
      if (!tokenRecord) return false;
      await query('DELETE FROM refresh_token WHERE id = $1', [tokenRecord.id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // 만료된 리프레시 토큰 일괄 삭제
  static async deleteExpiredTokens() {
    try {
      const { rows } = await query(
        `DELETE FROM refresh_token WHERE expires_at < $1 RETURNING id`,
        [new Date().toISOString()]
      );
      return rows.length;
    } catch (error) {
      throw error;
    }
  }
}

export default Token;