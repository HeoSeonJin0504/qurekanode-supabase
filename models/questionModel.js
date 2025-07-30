const { supabase } = require('../config/db');
const { formatDate, mapQuestionTypeToClient, mapQuestionTypeToDb } = require('../utils/formatUtil');

class Question {
  /**
   * 새 문제 정보 저장
   * @param {Object} questionData - 문제 데이터 객체
   * @returns {Object} 저장된 문제 정보
   */
  static async create(questionData) {
    try {
      const { userId, fileName, questionType, questionText } = questionData;
      
      // 필수 필드 검증
      if (!userId || !fileName || !questionType || !questionText) {
        throw new Error('필수 필드가 누락되었습니다.');
      }
      
      // questionType 값을 데이터베이스 타입으로 매핑
      const dbQuestionType = mapQuestionTypeToDb(questionType);
      
      // 문제 데이터를 JSON으로 저장 (향후 확장성)
      const questionData = {
        question_text: questionText,
        // 추가 필드는 여기에 추가
      };
      
      // Supabase에 문제 정보 저장
      const { data, error } = await supabase
        .from('user_questions')
        .insert({
          user_id: userId,
          file_name: fileName,
          question_type: dbQuestionType,
          question_data: questionData
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // 결과 반환 - 클라이언트 친화적인 형태로 매핑
      return {
        selection_id: data.selection_id,
        user_id: data.user_id,
        file_name: data.file_name,
        question_type: mapQuestionTypeToClient(data.question_type),
        created_at: data.created_at,
        formatted_date: formatDate(data.created_at)
      };
    } catch (error) {
      console.error('문제 정보 저장 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 사용자 ID로 문제 목록 조회
   * @param {number} userId - 사용자 ID
   * @returns {Array} 문제 목록
   */
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_questions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // DB 값을 클라이언트 친화적인 값으로 매핑
      return data.map(row => ({
        ...row,
        question_type: mapQuestionTypeToClient(row.question_type),
        formatted_date: formatDate(row.created_at),
        question_text: row.question_data.question_text
      }));
    } catch (error) {
      console.error('문제 목록 조회 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * ID로 특정 문제 조회
   * @param {number} selectionId - 문제 ID
   * @returns {Object|null} 문제 정보 또는 null
   */
  static async findById(selectionId) {
    try {
      const { data, error } = await supabase
        .from('user_questions')
        .select('*')
        .eq('selection_id', selectionId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      // DB 값을 클라이언트 친화적인 값으로 매핑
      return {
        ...data,
        question_type: mapQuestionTypeToClient(data.question_type),
        formatted_date: formatDate(data.created_at),
        question_text: data.question_data.question_text
      };
    } catch (error) {
      console.error('문제 정보 조회 오류:', error.message);
      throw error;
    }
  }

  /**
   * 문제 검색
   * @param {Object} criteria - 검색 조건
   * @returns {Array} 검색 결과
   */
  static async searchQuestions(criteria) {
    try {
      let query = supabase
        .from('user_questions')
        .select('*')
        .eq('user_id', criteria.userId);
      
      // 파일명 검색어가 있으면 조건 추가
      if (criteria.searchQuery) {
        query = query.ilike('file_name', `%${criteria.searchQuery}%`);
      }
      
      // 문제 유형 조건이 있으면 추가
      if (criteria.questionType) {
        // 클라이언트 문제 유형을 DB 문제 유형으로 변환
        const dbQuestionType = mapQuestionTypeToDb(criteria.questionType);
        query = query.eq('question_type', dbQuestionType);
      }
      
      // 정렬 조건 추가
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // DB 값을 클라이언트 친화적인 값으로 매핑
      return data.map(row => ({
        ...row,
        question_type: mapQuestionTypeToClient(row.question_type),
        formatted_date: formatDate(row.created_at),
        question_text: row.question_data.question_text
      }));
    } catch (error) {
      console.error('문제 검색 오류:', error.message);
      throw error;
    }
  }

  /**
   * 모든 문제 목록 조회
   * @returns {Array} 모든 문제 목록
   */
  static async findAll() {
    try {
      const { data, error } = await supabase
        .from('user_questions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // DB 값을 클라이언트 친화적인 값으로 매핑
      return data.map(row => ({
        ...row,
        question_type: mapQuestionTypeToClient(row.question_type),
        formatted_date: formatDate(row.created_at),
        question_text: row.question_data.question_text
      }));
    } catch (error) {
      console.error('모든 문제 조회 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * ID로 문제 정보 삭제
   * @param {number} selectionId - 삭제할 문제 ID
   * @returns {boolean} 삭제 성공 여부
   */
  static async deleteById(selectionId) {
    try {
      const { error } = await supabase
        .from('user_questions')
        .delete()
        .eq('selection_id', selectionId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('문제 정보 삭제 오류:', error.message);
      throw error;
    }
  }
}

module.exports = Question;