import { query } from '../config/db.js';
import { formatDate } from '../utils/formatUtil.js';

function mapTypeToDb(clientType) {
  const m = { 'n지 선다형': 'multiple_choice', '순서 배열형': 'sequence', '빈칸 채우기형': 'fill_in_the_blank', '참거짓형': 'true_false', '단답형': 'short_answer', '서술형': 'descriptive' };
  return m[clientType] || clientType;
}

function mapTypeToClient(dbType) {
  const m = { multiple_choice: 'n지 선다형', sequence: '순서 배열형', fill_in_the_blank: '빈칸 채우기형', true_false: '참거짓형', short_answer: '단답형', descriptive: '서술형' };
  return m[dbType] || dbType;
}

function toClient(row) {
  return { ...row, question_type: mapTypeToClient(row.question_type), formatted_date: formatDate(row.created_at), question_text: row.question_data?.question_text };
}

class Question {
  static async create({ userId, fileName, questionName, questionType, questionText }) {
    try {
      if (!userId || !fileName || !questionType || !questionText) throw new Error('필수 필드가 누락되었습니다.');
      const { rows } = await query(
        `INSERT INTO user_questions (user_id, file_name, question_name, question_type, question_data)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, fileName, questionName || 'Untitled Question', mapTypeToDb(questionType), JSON.stringify({ question_text: questionText })]
      );
      return toClient(rows[0]);
    } catch (error) {
      console.error('문제 정보 저장 오류:', error.message);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const { rows } = await query('SELECT * FROM user_questions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return rows.map(toClient);
    } catch (error) {
      console.error('문제 목록 조회 오류:', error.message);
      throw error;
    }
  }

  static async findById(selectionId) {
    try {
      const { rows } = await query('SELECT * FROM user_questions WHERE selection_id = $1', [selectionId]);
      return rows[0] ? toClient(rows[0]) : null;
    } catch (error) {
      console.error('문제 정보 조회 오류:', error.message);
      throw error;
    }
  }

  static async updateName(selectionId, newName) {
    try {
      if (!newName?.trim()) throw new Error('문제 이름은 비어있을 수 없습니다.');
      const { rows } = await query(
        'UPDATE user_questions SET question_name = $1 WHERE selection_id = $2 RETURNING *',
        [newName.trim(), selectionId]
      );
      return toClient(rows[0]);
    } catch (error) {
      console.error('문제 이름 변경 오류:', error.message);
      throw error;
    }
  }

  static async deleteById(selectionId) {
    try {
      await query('DELETE FROM user_questions WHERE selection_id = $1', [selectionId]);
      return true;
    } catch (error) {
      console.error('문제 정보 삭제 오류:', error.message);
      throw error;
    }
  }
}

export default Question;