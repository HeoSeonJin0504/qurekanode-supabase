const { supabase } = require('../config/db');
const { formatDate, mapQuestionTypeToClient } = require('../utils/formatUtil');

/**
 * 문제 및 요약 메타데이터 서비스
 */
const problemSummaryMetaService = {
  /**
   * 모든 문제 메타데이터 조회
   * @returns {Array} 문제 메타데이터 목록
   */
  async getAllProblemSummaryMeta() {
    try {
      // 문제 메타데이터 가져오기 (문제 텍스트 제외)
      const { data: questions, error: questionsError } = await supabase
        .from('user_questions')
        .select('selection_id, user_id, file_name, question_type, created_at')
        .order('created_at', { ascending: false });
      
      if (questionsError) throw questionsError;
      
      // 사용자 정보 가져오기
      const userIds = [...new Set(questions.map(q => q.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('userindex, name')
        .in('userindex', userIds);
      
      if (usersError) throw usersError;
      
      // 사용자 맵 생성
      const userMap = {};
      users.forEach(user => {
        userMap[user.userindex] = user.name;
      });
      
      // 메타데이터 매핑
      const metas = questions.map(question => ({
        id: question.selection_id,
        userId: question.user_id,
        userName: userMap[question.user_id] || '알 수 없음',
        fileName: question.file_name,
        type: mapQuestionTypeToClient(question.question_type),
        contentType: 'question',
        createdAt: question.created_at,
        formattedDate: formatDate(question.created_at)
      }));
      
      return metas;
    } catch (error) {
      console.error('문제 메타데이터 조회 오류:', error);
      throw error;
    }
  },
  
  /**
   * 특정 ID의 문제 메타데이터 조회
   * @param {number} id - 문제 ID
   * @returns {Object|null} 문제 메타데이터 또는 null
   */
  async getProblemSummaryMetaById(id) {
    try {
      // 문제 메타데이터 가져오기
      const { data: question, error: questionError } = await supabase
        .from('user_questions')
        .select('*')
        .eq('selection_id', id)
        .single();
      
      if (questionError) {
        if (questionError.code === 'PGRST116') return null;
        throw questionError;
      }
      
      // 사용자 정보 가져오기
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('userindex', question.user_id)
        .single();
      
      if (userError) throw userError;
      
      // 메타데이터 매핑
      return {
        id: question.selection_id,
        userId: question.user_id,
        userName: user ? user.name : '알 수 없음',
        fileName: question.file_name,
        type: mapQuestionTypeToClient(question.question_type),
        contentType: 'question',
        createdAt: question.created_at,
        formattedDate: formatDate(question.created_at),
        questionData: question.question_data
      };
    } catch (error) {
      console.error(`문제 ID ${id} 메타데이터 조회 오류:`, error);
      throw error;
    }
  }
};

module.exports = problemSummaryMetaService;
