import { query } from '../config/db.js';
import { formatDate } from '../utils/formatUtil.js';

function mapTypeToClient(dbType) {
  const m = { multiple_choice: 'n지 선다형', sequence: '순서 배열형', fill_in_the_blank: '빈칸 채우기형', true_false: '참거짓형', short_answer: '단답형', descriptive: '서술형' };
  return m[dbType] || dbType;
}

class Favorite {
  static async getFoldersByUserId(userId) {
    try {
      const { rows: folders } = await query(
        'SELECT * FROM favorite_folders WHERE user_id = $1 ORDER BY created_at DESC', [userId]
      );
      return await Promise.all(folders.map(async (folder) => {
        const { rows } = await query('SELECT COUNT(*) FROM favorite_questions WHERE folder_id = $1', [folder.folder_id]);
        return { ...folder, question_count: parseInt(rows[0].count), formatted_date: formatDate(folder.created_at) };
      }));
    } catch (error) {
      console.error('즐겨찾기 폴더 조회 오류:', error.message); throw error;
    }
  }

  static async createFolder({ userId, folderName, description }) {
    try {
      const { rows: existing } = await query(
        'SELECT folder_id FROM favorite_folders WHERE user_id = $1 AND folder_name = $2', [userId, folderName]
      );
      if (existing[0]) throw new Error('이미 존재하는 폴더 이름입니다.');
      const { rows } = await query(
        'INSERT INTO favorite_folders (user_id, folder_name, description) VALUES ($1, $2, $3) RETURNING *',
        [userId, folderName, description || null]
      );
      return { ...rows[0], formatted_date: formatDate(rows[0].created_at) };
    } catch (error) {
      console.error('즐겨찾기 폴더 생성 오류:', error.message); throw error;
    }
  }

  static async deleteFolder(folderId, userId) {
    try {
      const { rows } = await query(
        'SELECT folder_name FROM favorite_folders WHERE folder_id = $1 AND user_id = $2', [folderId, userId]
      );
      if (!rows[0]) throw new Error('폴더를 찾을 수 없습니다.');
      if (rows[0].folder_name === '기본 폴더') throw new Error('기본 폴더는 삭제할 수 없습니다.');
      await query('DELETE FROM favorite_folders WHERE folder_id = $1 AND user_id = $2', [folderId, userId]);
      return true;
    } catch (error) {
      console.error('즐겨찾기 폴더 삭제 오류:', error.message); throw error;
    }
  }

  static async createDefaultFolder(userId) {
    try {
      const { rows } = await query(
        'SELECT folder_id FROM favorite_folders WHERE user_id = $1 AND folder_name = $2', [userId, '기본 폴더']
      );
      if (rows[0]) return rows[0];
      return await this.createFolder({ userId, folderName: '기본 폴더', description: '기본 즐겨찾기 폴더' });
    } catch (error) {
      console.error('기본 폴더 생성 오류:', error.message); throw error;
    }
  }

  static async getOrCreateDefaultFolder(userId) {
    try {
      const { rows } = await query(
        'SELECT * FROM favorite_folders WHERE user_id = $1 AND folder_name = $2', [userId, '기본 폴더']
      );
      if (rows[0]) return rows[0];
      return await this.createFolder({ userId, folderName: '기본 폴더', description: '기본 즐겨찾기 폴더' });
    } catch (error) {
      console.error('기본 폴더 조회/생성 오류:', error.message); throw error;
    }
  }

  static async addQuestion({ userId, folderId, questionId, questionIndex }) {
    try {
      questionIndex = questionIndex ?? 0;
      if (!folderId) {
        folderId = (await this.getOrCreateDefaultFolder(userId)).folder_id;
      } else {
        const { rows } = await query(
          'SELECT folder_id FROM favorite_folders WHERE folder_id = $1 AND user_id = $2', [folderId, userId]
        );
        if (!rows[0]) folderId = (await this.getOrCreateDefaultFolder(userId)).folder_id;
      }
      const { rows: qRows } = await query('SELECT user_id FROM user_questions WHERE selection_id = $1', [questionId]);
      if (!qRows[0]) throw new Error('존재하지 않는 문제입니다.');
      if (qRows[0].user_id !== userId) throw new Error('해당 문제에 대한 권한이 없습니다.');
      const { rows } = await query(
        'INSERT INTO favorite_questions (user_id, folder_id, question_id, question_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, folderId, questionId, questionIndex]
      );
      return rows[0];
    } catch (error) {
      if (error.code === '23505') throw new Error('이미 즐겨찾기에 추가된 문제입니다.');
      console.error('즐겨찾기 추가 오류:', error.message); throw error;
    }
  }

  static async removeQuestion(favoriteId, userId) {
    try {
      await query('DELETE FROM favorite_questions WHERE favorite_id = $1 AND user_id = $2', [favoriteId, userId]);
      return true;
    } catch (error) {
      console.error('즐겨찾기 제거 오류:', error.message); throw error;
    }
  }

  static async checkQuestion(userId, questionId, questionIndex = null) {
    try {
      let sql    = 'SELECT favorite_id, folder_id, question_index FROM favorite_questions WHERE user_id = $1 AND question_id = $2';
      const params = [userId, questionId];
      if (questionIndex !== null) { sql += ' AND question_index = $3'; params.push(questionIndex); }
      const { rows } = await query(sql, params);
      return rows[0] || null;
    } catch (error) {
      console.error('즐겨찾기 확인 오류:', error.message); throw error;
    }
  }

  static async checkMultipleQuestions(userId, questions) {
    try {
      if (!questions?.length) return [];
      const ids = questions.map((q) => q.questionId);
      const { rows } = await query(
        'SELECT question_id, question_index, favorite_id, folder_id FROM favorite_questions WHERE user_id = $1 AND question_id = ANY($2)',
        [userId, ids]
      );
      const map = new Map();
      rows.forEach((r) => map.set(`${r.question_id}_${r.question_index}`, r));
      return questions.map((q) => {
        const qi  = q.questionIndex ?? 0;
        const fav = map.get(`${q.questionId}_${qi}`);
        return { questionId: q.questionId, questionIndex: qi, isFavorite: !!fav, favoriteId: fav?.favorite_id || null, folderId: fav?.folder_id || null };
      });
    } catch (error) {
      console.error('대량 즐겨찾기 확인 오류:', error.message); throw error;
    }
  }

  static async getAllQuestions(userId) {
    try {
      const { rows } = await query(
        `SELECT fq.favorite_id, fq.folder_id, fq.question_index, fq.created_at AS favorited_at,
                ff.folder_name, uq.*
         FROM favorite_questions fq
         JOIN favorite_folders ff ON fq.folder_id = ff.folder_id
         JOIN user_questions   uq ON fq.question_id = uq.selection_id
         WHERE fq.user_id = $1
         ORDER BY fq.created_at DESC`,
        [userId]
      );
      return rows.map((r) => ({
        selection_id: r.selection_id, user_id: r.user_id, file_name: r.file_name,
        question_name: r.question_name, question_type: mapTypeToClient(r.question_type),
        created_at: r.created_at, question_text: r.question_data?.question_text || '{}',
        favorite_id: r.favorite_id, folder_id: r.folder_id, folder_name: r.folder_name,
        question_index: r.question_index, favorited_at: r.favorited_at,
        formatted_date: formatDate(r.created_at),
      }));
    } catch (error) {
      console.error('즐겨찾기 문제 목록 조회 오류:', error.message); throw error;
    }
  }

  static async getQuestionsByFolder(folderId, userId) {
    try {
      const { rows: folderRows } = await query(
        'SELECT * FROM favorite_folders WHERE folder_id = $1 AND user_id = $2', [folderId, userId]
      );
      if (!folderRows[0]) throw new Error('폴더를 찾을 수 없습니다.');
      const { rows: qRows } = await query(
        `SELECT fq.favorite_id, fq.question_index, fq.created_at AS favorited_at, uq.*
         FROM favorite_questions fq
         JOIN user_questions uq ON fq.question_id = uq.selection_id
         WHERE fq.folder_id = $1 AND fq.user_id = $2
         ORDER BY fq.created_at DESC`,
        [folderId, userId]
      );
      return {
        folder: { ...folderRows[0], formatted_date: formatDate(folderRows[0].created_at) },
        questions: qRows.map((r) => ({
          selection_id: r.selection_id, user_id: r.user_id, file_name: r.file_name,
          question_name: r.question_name, question_type: mapTypeToClient(r.question_type),
          created_at: r.created_at, question_text: r.question_data?.question_text || '{}',
          favorite_id: r.favorite_id, question_index: r.question_index,
          favorited_at: r.favorited_at, formatted_date: formatDate(r.created_at),
        })),
      };
    } catch (error) {
      console.error('폴더별 즐겨찾기 문제 조회 오류:', error.message); throw error;
    }
  }
}

export default Favorite;