const { supabase } = require('../config/db');
const { formatDate } = require('../utils/formatUtil');

/**
 * 클라이언트 요약 타입을 DB 타입으로 변환
 */
function mapSummaryTypeToDb(clientType) {
  const mapping = {
    '기본 요약': 'basic',
    '핵심 요약': 'key_points',
    '주제 요약': 'topic',
    '목차 요약': 'outline',
    '키워드 요약': 'keywords'
  };
  
  return mapping[clientType] || clientType;
}

/**
 * DB 요약 타입을 클라이언트 타입으로 변환
 */
function mapSummaryTypeToClient(dbType) {
  const mapping = {
    'basic': '기본 요약',
    'key_points': '핵심 요약',
    'topic': '주제 요약',
    'outline': '목차 요약',
    'keywords': '키워드 요약'
  };
  
  return mapping[dbType] || dbType;
}

class Summary {
  /**
   * 새 요약 정보 저장
   * @param {Object} summaryData - 요약 데이터 객체
   * @returns {Object} 저장된 요약 정보
   */
  static async create(summaryData) {
    try {
      const { userId, fileName, summaryType, summaryText } = summaryData;
      
      // 필수 필드 검증
      if (!userId || !fileName || !summaryType || !summaryText) {
        throw new Error('필수 필드가 누락되었습니다.');
      }
      
      // summaryType 값을 데이터베이스 타입으로 매핑
      const dbSummaryType = mapSummaryTypeToDb(summaryType);
      
      // Supabase에 요약 정보 저장
      const { data, error } = await supabase
        .from('user_summaries')
        .insert({
          user_id: userId,
          file_name: fileName,
          summary_type: dbSummaryType,
          summary_text: summaryText
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // 결과 반환 - 클라이언트 친화적인 형태로 매핑
      return {
        selection_id: data.selection_id,
        user_id: data.user_id,
        file_name: data.file_name,
        summary_type: mapSummaryTypeToClient(data.summary_type),
        created_at: data.created_at,
        formatted_date: formatDate(data.created_at)
      };
    } catch (error) {
      console.error('요약 정보 저장 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 사용자 ID로 요약 목록 조회
   * @param {number} userId - 사용자 ID
   * @returns {Array} 요약 목록
   */
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // DB 값을 클라이언트 친화적인 값으로 매핑
      return data.map(row => ({
        ...row,
        summary_type: mapSummaryTypeToClient(row.summary_type),
        formatted_date: formatDate(row.created_at)
      }));
    } catch (error) {
      console.error('요약 목록 조회 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * ID로 특정 요약 조회
   * @param {number} selectionId - 요약 ID
   * @returns {Object|null} 요약 정보 또는 null
   */
  static async findById(selectionId) {
    try {
      const { data, error } = await supabase
        .from('user_summaries')
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
        summary_type: mapSummaryTypeToClient(data.summary_type),
        formatted_date: formatDate(data.created_at)
      };
    } catch (error) {
      console.error('요약 정보 조회 오류:', error.message);
      throw error;
    }
  }

  /**
   * 요약 검색
   * @param {Object} criteria - 검색 조건
   * @returns {Array} 검색 결과
   */
  static async searchSummaries(criteria) {
    try {
      let query = supabase
        .from('user_summaries')
        .select('*')
        .eq('user_id', criteria.userId);
      
      // 파일명 검색어가 있으면 조건 추가
      if (criteria.searchQuery) {
        query = query.ilike('file_name', `%${criteria.searchQuery}%`);
      }
      
      // 요약 유형 조건이 있으면 추가
      if (criteria.summaryType) {
        // 클라이언트 요약 유형을 DB 요약 유형으로 변환
        const dbSummaryType = mapSummaryTypeToDb(criteria.summaryType);
        query = query.eq('summary_type', dbSummaryType);
      }
      
      // 정렬 조건 추가
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // DB 값을 클라이언트 친화적인 값으로 매핑
      return data.map(row => ({
        ...row,
        summary_type: mapSummaryTypeToClient(row.summary_type),
        formatted_date: formatDate(row.created_at)
      }));
    } catch (error) {
      console.error('요약 검색 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * ID로 요약 정보 삭제
   * @param {number} selectionId - 삭제할 요약 ID
   * @returns {boolean} 삭제 성공 여부
   */
  static async deleteById(selectionId) {
    try {
      const { error } = await supabase
        .from('user_summaries')
        .delete()
        .eq('selection_id', selectionId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('요약 정보 삭제 오류:', error.message);
      throw error;
    }
  }
}

module.exports = Summary;