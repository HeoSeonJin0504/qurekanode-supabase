const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// 환경 변수에서 Supabase 연결 정보 가져오기
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Supabase 자격 증명 확인
if (!SUPABASE_URL || !SUPABASE_KEY) {
    logger.error('Supabase 자격 증명이 누락되었습니다. 환경 변수를 확인해주세요.');
    throw new Error('Supabase 자격 증명 누락');
}

// Supabase 클라이언트 초기화
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

/**
 * 데이터베이스 연결 확인
 * @returns {Promise<boolean>} 연결 성공 여부
 */
async function checkConnection() {
    try {
        // 간단한 쿼리로 연결 테스트
        const { error } = await supabase
            .from('users')
            .select('name')
            .limit(1);
        
        // 에러가 발생했지만, 테이블이 없는 경우는 연결 성공으로 간주
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
            // 로그 출력을 제거하고 결과만 반환
            return false;
        }
        
        return true;
    } catch (error) {
        // 로그 출력을 제거하고 결과만 반환
        return false;
    }
}

/**
 * 안전한 쿼리 실행을 위한 헬퍼 함수
 * @param {Function} queryFunction - 실행할 쿼리 함수
 * @returns {Promise<Object>} 쿼리 결과
 */
async function executeQuery(queryFunction) {
    try {
        const result = await queryFunction();
        return {
            success: true,
            data: result.data,
            error: result.error
        };
    } catch (error) {
        logger.error('쿼리 실행 오류: ' + error.message);
        return {
            success: false,
            data: null,
            error: error
        };
    }
}

module.exports = {
    supabase,
    checkConnection,
    executeQuery
};
