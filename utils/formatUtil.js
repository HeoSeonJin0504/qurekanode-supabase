// 날짜 문자열을 한국어 형식으로 변환
export const formatDate = (dateString, includeTime = true) => {
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return date.toLocaleDateString('ko-KR', options);
  } catch (error) {
    console.error('날짜 형식 변환 오류:', error);
    return dateString;
  }
};

// DB 요약 타입을 클라이언트 표시명으로 변환
export const mapSummaryTypeToClient = (dbType) => {
  const mapping = { basic: '기본 요약', key_points: '핵심 요약', topic: '주제 요약', outline: '목차 요약', keywords: '키워드 요약' };
  return mapping[dbType] || dbType;
};

export const mapSummaryTypeToDb = (clientType) => {
  const mapping = { '기본 요약': 'basic', '핵심 요약': 'key_points', '주제 요약': 'topic', '목차 요약': 'outline', '키워드 요약': 'keywords' };
  return mapping[clientType] || clientType;
};

// DB 문제 타입을 클라이언트 표시명으로 변환
export const mapQuestionTypeToClient = (dbType) => {
  const mapping = { multiple_choice: 'n지 선다형', sequence: '순서 배열형', true_false: '참/거짓형', fill_in_the_blank: '빈칸 채우기형', short_answer: '단답형', descriptive: '서술형' };
  return mapping[dbType] || dbType;
};

export const mapQuestionTypeToDb = (clientType) => {
  const mapping = { 'n지 선다형': 'multiple_choice', '순서 배열형': 'sequence', '참/거짓형': 'true_false', '빈칸 채우기형': 'fill_in_the_blank', '단답형': 'short_answer', '서술형': 'descriptive' };
  return mapping[clientType] || clientType;
};

export const successResponse = (data, message) => ({
  success: true, message: message || 'Operation successful', data: data || null, timestamp: new Date().toISOString(),
});

export const errorResponse = (message, statusCode, error) => ({
  success: false, message: message || 'Operation failed', statusCode: statusCode || 500,
  error: error ? (error.message || error) : null, timestamp: new Date().toISOString(),
});

export const paginatedResponse = (data, page, limit, total, message) => {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true, message: message || 'Data retrieved successfully', data: data || [],
    pagination: { current_page: page, per_page: limit, total_items: total, total_pages: totalPages, has_next: page < totalPages, has_prev: page > 1 },
    timestamp: new Date().toISOString(),
  };
};
