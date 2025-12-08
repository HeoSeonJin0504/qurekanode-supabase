const { supabase } = require('../config/db');
const { formatDate, mapQuestionTypeToClient } = require('../utils/formatUtil');
const logger = require('../utils/logger');

const problemSummaryMetaController = {
  /**
   * 모든 문제 메타데이터 조회
   */
  async getAllProblemSummaryMeta(req, res) {
    try {
      const { data: questions, error: questionsError } = await supabase
        .from('user_questions')
        .select('selection_id, user_id, file_name, question_type, created_at')
        .order('created_at', { ascending: false });
      
      if (questionsError) throw questionsError;
      
      const metas = questions.map((question) => ({
        id: question.selection_id,
        userId: question.user_id,
        fileName: question.file_name,
        questionType: mapQuestionTypeToClient(question.question_type),
        createdAt: formatDate(question.created_at)
      }));
      
      return res.status(200).json({
        success: true,
        count: metas.length,
        metas
      });
    } catch (error) {
      logger.error('문제 메타데이터 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 특정 ID의 문제 메타데이터 조회
   */
  async getProblemSummaryMetaById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: '문제 ID가 필요합니다.'
        });
      }
      
      const { data: meta, error: metaError } = await supabase
        .from('user_questions')
        .select('selection_id, user_id, file_name, question_type, created_at')
        .eq('selection_id', id)
        .single();
      
      if (metaError) throw metaError;
      
      if (!meta) {
        return res.status(404).json({
          success: false,
          message: '해당 ID의 문제를 찾을 수 없습니다.'
        });
      }
      
      return res.status(200).json({
        success: true,
        meta: {
          id: meta.selection_id,
          userId: meta.user_id,
          fileName: meta.file_name,
          questionType: mapQuestionTypeToClient(meta.question_type),
          createdAt: formatDate(meta.created_at)
        }
      });
    } catch (error) {
      logger.error(`문제 ID ${req.params.id} 메타데이터 조회 오류:`, error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
};

module.exports = problemSummaryMetaController;
