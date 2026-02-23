import { query } from '../config/db.js';
import { formatDate } from '../utils/formatUtil.js';

// 클라이언트 요약 타입을 DB 콼럼값으로 변환
function mapTypeToDb(clientType) {
  const m = { '기본 요약': 'basic', '핵심 요약': 'key_points', '주제 요약': 'topic', '목차 요약': 'outline', '키워드 요약': 'keywords' };
  return m[clientType] || clientType;
}

// DB 요약 타입을 클라이언트 표시명으로 변환
function mapTypeToClient(dbType) {
  const m = { basic: '기본 요약', key_points: '핵심 요약', topic: '주제 요약', outline: '목차 요약', keywords: '키워드 요약' };
  return m[dbType] || dbType;
}

function toClient(row) {
  return { ...row, summary_type: mapTypeToClient(row.summary_type), formatted_date: formatDate(row.created_at) };
}

class Summary {
  // 새 요약 레코드를 DB에 삽입
  static async create({ userId, fileName, summaryName, summaryType, summaryText }) {
    try {
      if (!userId || !fileName || !summaryType || !summaryText) throw new Error('필수 필드가 누락되었습니다.');
      const { rows } = await query(
        `INSERT INTO user_summaries (user_id, file_name, summary_name, summary_type, summary_text)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, fileName, summaryName || 'Untitled Summary', mapTypeToDb(summaryType), summaryText]
      );
      return toClient(rows[0]);
    } catch (error) {
      console.error('요약 정보 저장 오류:', error.message);
      throw error;
    }
  }

  // 사용자 ID로 요약 목록 조회
  static async findByUserId(userId) {
    try {
      const { rows } = await query('SELECT * FROM user_summaries WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return rows.map(toClient);
    } catch (error) {
      console.error('요약 목록 조회 오류:', error.message);
      throw error;
    }
  }

  // selection_id로 요약 상세 조회
  static async findById(selectionId) {
    try {
      const { rows } = await query('SELECT * FROM user_summaries WHERE selection_id = $1', [selectionId]);
      return rows[0] ? toClient(rows[0]) : null;
    } catch (error) {
      console.error('요약 정보 조회 오류:', error.message);
      throw error;
    }
  }

  // 요약 이름 업데이트
  static async updateName(selectionId, newName) {
    try {
      if (!newName?.trim()) throw new Error('요약 이름은 비어있을 수 없습니다.');
      const { rows } = await query(
        'UPDATE user_summaries SET summary_name = $1 WHERE selection_id = $2 RETURNING *',
        [newName.trim(), selectionId]
      );
      return toClient(rows[0]);
    } catch (error) {
      console.error('요약 이름 변경 오류:', error.message);
      throw error;
    }
  }

  // selection_id로 요약 삭제
  static async deleteById(selectionId) {
    try {
      await query('DELETE FROM user_summaries WHERE selection_id = $1', [selectionId]);
      return true;
    } catch (error) {
      console.error('요약 정보 삭제 오류:', error.message);
      throw error;
    }
  }

  // 키워드·타입으로 요약 검색
  static async searchByUserId(userId, { query: searchQuery, type } = {}) {
    try {
      let sql = 'SELECT * FROM user_summaries WHERE user_id = $1';
      const params = [userId];
      let idx = 2;
      if (searchQuery) {
        sql += ` AND (summary_name ILIKE $${idx} OR summary_text ILIKE $${idx})`;
        params.push(`%${searchQuery}%`);
        idx++;
      }
      if (type) {
        sql += ` AND summary_type = $${idx}`;
        params.push(mapTypeToDb(type));
        idx++;
      }
      sql += ' ORDER BY created_at DESC';
      const { rows } = await query(sql, params);
      return rows.map(toClient);
    } catch (error) {
      console.error('요약 검색 오류:', error.message);
      throw error;
    }
  }

  // summary_text 제외한 메타데이터만 조회 (목록 로딩 경량화)
  static async findMetaByUserId(userId) {
    try {
      const { rows } = await query(
        'SELECT selection_id, user_id, file_name, summary_name, summary_type, created_at FROM user_summaries WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return rows.map((row) => ({
        ...row,
        summary_type: mapTypeToClient(row.summary_type),
        formatted_date: formatDate(row.created_at),
      }));
    } catch (error) {
      console.error('요약 메타데이터 조회 오류:', error.message);
      throw error;
    }
  }
}

export default Summary;