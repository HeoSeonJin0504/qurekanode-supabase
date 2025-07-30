/**
 * 데이터 포맷팅 유틸리티
 */

/**
 * ISO 날짜 문자열을 사용자 친화적인 형식으로 변환
 * @param {string|Date} dateString - ISO 형식 날짜 문자열 또는 Date 객체
 * @param {boolean} includeTime - 시간 포함 여부
 * @returns {string} 포맷된 날짜 문자열
 */
const formatDate = (dateString, includeTime = true) => {
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    
    // 유효한 날짜가 아니면 원본 반환
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('ko-KR', options);
  } catch (error) {
    console.error('날짜 형식 변환 오류:', error);
    return dateString; // 오류 시 원본 반환
  }
};

/**
 * DB 요약 타입을 클라이언트 요약 타입으로 매핑
 * @param {string} dbType - 데이터베이스 요약 타입
 * @returns {string} 클라이언트 요약 타입
 */
const mapSummaryTypeToClient = (dbType) => {
  const mapping = {
    'basic': '기본 요약',
    'key_points': '핵심 요약',
    'topic': '주제 요약',
    'outline': '목차 요약',
    'keywords': '키워드 요약'
  };
  
  return mapping[dbType] || dbType;
};

/**
 * 클라이언트 요약 타입을 DB 요약 타입으로 매핑
 * @param {string} clientType - 클라이언트 요약 타입
 * @returns {string} 데이터베이스 요약 타입
 */
const mapSummaryTypeToDb = (clientType) => {
  const mapping = {
    '기본 요약': 'basic',
    '핵심 요약': 'key_points',
    '주제 요약': 'topic',
    '목차 요약': 'outline',
    '키워드 요약': 'keywords'
  };
  
  return mapping[clientType] || clientType;
};

/**
 * DB 문제 타입을 클라이언트 문제 타입으로 매핑
 * @param {string} dbType - 데이터베이스 문제 타입
 * @returns {string} 클라이언트 문제 타입
 */
const mapQuestionTypeToClient = (dbType) => {
  const mapping = {
    'multiple_choice': 'n지 선다형',
    'sequence': '순서 배열형',
    'true_false': '참/거짓형',
    'fill_in_the_blank': '빈칸 채우기형',
    'short_answer': '단답형',
    'descriptive': '서술형'
  };
  
  return mapping[dbType] || dbType;
};

/**
 * 클라이언트 문제 타입을 DB 문제 타입으로 매핑
 * @param {string} clientType - 클라이언트 문제 타입
 * @returns {string} 데이터베이스 문제 타입
 */
const mapQuestionTypeToDb = (clientType) => {
  const mapping = {
    'n지 선다형': 'multiple_choice',
    '순서 배열형': 'sequence',
    '참/거짓형': 'true_false',
    '빈칸 채우기형': 'fill_in_the_blank',
    '단답형': 'short_answer',
    '서술형': 'descriptive'
  };
  
  return mapping[clientType] || clientType;
};

/**
 * 성공 응답을 위한 형식 생성
 * @param {any} data - 응답 데이터
 * @param {string} message - 응답 메시지
 * @returns {Object} 형식화된 응답 객체
 */
function successResponse(data, message) {
    return {
        success: true,
        message: message || 'Operation successful',
        data: data || null,
        timestamp: new Date().toISOString()
    };
}

/**
 * 에러 응답을 위한 형식 생성
 * @param {string} message - 에러 메시지
 * @param {number} statusCode - HTTP 상태 코드
 * @param {any} error - 에러 상세 정보
 * @returns {Object} 형식화된 에러 응답 객체
 */
function errorResponse(message, statusCode, error) {
    return {
        success: false,
        message: message || 'Operation failed',
        statusCode: statusCode || 500,
        error: error ? (error.message || error) : null,
        timestamp: new Date().toISOString()
    };
}

/**
 * 페이지네이션 응답을 위한 형식 생성
 * @param {Array} data - 응답 데이터 배열
 * @param {number} page - 현재 페이지
 * @param {number} limit - 페이지당 항목 수
 * @param {number} total - 전체 항목 수
 * @param {string} message - 응답 메시지
 * @returns {Object} 형식화된 페이지네이션 응답 객체
 */
function paginatedResponse(data, page, limit, total, message) {
    const totalPages = Math.ceil(total / limit);
    
    return {
        success: true,
        message: message || 'Data retrieved successfully',
        data: data || [],
        pagination: {
            current_page: page,
            per_page: limit,
            total_items: total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1
        },
        timestamp: new Date().toISOString()
    };
}

module.exports = {
  formatDate,
  mapSummaryTypeToClient,
  mapSummaryTypeToDb,
  mapQuestionTypeToClient,
  mapQuestionTypeToDb,
  successResponse,
  errorResponse,
  paginatedResponse
};
