import { query } from '../config/db.js';
import { formatDate, mapQuestionTypeToClient } from '../utils/formatUtil.js';
import logger from '../utils/logger.js';

const problemSummaryMetaController = {
  // 전체 문제 메타데이터 목록 조회
  async getAllProblemSummaryMeta(req, res) {
    try {
      const { rows } = await query(
        'SELECT selection_id, user_id, file_name, question_type, created_at FROM user_questions ORDER BY created_at DESC'
      );
      const metas = rows.map((q) => ({
        id: q.selection_id, userId: q.user_id, fileName: q.file_name,
        questionType: mapQuestionTypeToClient(q.question_type), createdAt: formatDate(q.created_at),
      }));
      return res.status(200).json({ success: true, count: metas.length, metas });
    } catch (error) {
      logger.error('문제 메타데이터 조회 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 특정 ID의 문제 메타데이터 조회
  async getProblemSummaryMetaById(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ success: false, message: '문제 ID가 필요합니다.' });
      const { rows } = await query(
        'SELECT selection_id, user_id, file_name, question_type, created_at FROM user_questions WHERE selection_id = $1',
        [id]
      );
      if (!rows[0]) return res.status(404).json({ success: false, message: '해당 ID의 문제를 찾을 수 없습니다.' });
      const meta = rows[0];
      return res.status(200).json({
        success: true,
        meta: { id: meta.selection_id, userId: meta.user_id, fileName: meta.file_name, questionType: mapQuestionTypeToClient(meta.question_type), createdAt: formatDate(meta.created_at) },
      });
    } catch (error) {
      logger.error(`문제 ID ${req.params.id} 메타데이터 조회 오류:`, error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },
};

export default problemSummaryMetaController;