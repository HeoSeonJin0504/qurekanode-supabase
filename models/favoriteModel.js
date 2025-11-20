const { supabase } = require('../config/db');
const { formatDate } = require('../utils/formatUtil');

/**
 * DB 문제 타입을 클라이언트 타입으로 변환
 */
function mapQuestionTypeToClient(dbType) {
  const mapping = {
    'multiple_choice': 'n지 선다형',
    'sequence': '순서 배열형',
    'fill_in_the_blank': '빈칸 채우기형',
    'true_false': '참거짓형',
    'short_answer': '단답형',
    'descriptive': '서술형'
  };
  
  return mapping[dbType] || dbType;
}

class Favorite {
  // ==================== 폴더 관리 ====================
  
  /**
   * 사용자의 모든 즐겨찾기 폴더 조회
   * @param {number} userId - 사용자 ID
   * @returns {Array} 폴더 목록 (문제 개수 포함)
   */
  static async getFoldersByUserId(userId) {
    try {
      const { data: folders, error: folderError } = await supabase
        .from('favorite_folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (folderError) throw folderError;
      
      // 각 폴더별 문제 개수 조회
      const foldersWithCount = await Promise.all(
        folders.map(async (folder) => {
          const { count, error: countError } = await supabase
            .from('favorite_questions')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', folder.folder_id);
          
          return {
            ...folder,
            question_count: countError ? 0 : count,
            formatted_date: formatDate(folder.created_at)
          };
        })
      );
      
      return foldersWithCount;
    } catch (error) {
      console.error('즐겨찾기 폴더 조회 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 새 즐겨찾기 폴더 생성
   * @param {Object} folderData - 폴더 데이터
   * @returns {Object} 생성된 폴더 정보
   */
  static async createFolder(folderData) {
    try {
      const { userId, folderName, description } = folderData;
      
      // 폴더명 중복 체크
      const { data: existing } = await supabase
        .from('favorite_folders')
        .select('folder_id')
        .eq('user_id', userId)
        .eq('folder_name', folderName)
        .single();
      
      if (existing) {
        throw new Error('이미 존재하는 폴더 이름입니다.');
      }
      
      const { data, error } = await supabase
        .from('favorite_folders')
        .insert({
          user_id: userId,
          folder_name: folderName,
          description: description || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        formatted_date: formatDate(data.created_at)
      };
    } catch (error) {
      console.error('즐겨찾기 폴더 생성 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 즐겨찾기 폴더 삭제
   * @param {number} folderId - 폴더 ID
   * @param {number} userId - 사용자 ID (권한 확인용)
   * @returns {boolean} 삭제 성공 여부
   */
  static async deleteFolder(folderId, userId) {
    try {
      // 기본 폴더 삭제 방지
      const { data: folder } = await supabase
        .from('favorite_folders')
        .select('folder_name')
        .eq('folder_id', folderId)
        .eq('user_id', userId)
        .single();
      
      if (!folder) {
        throw new Error('폴더를 찾을 수 없습니다.');
      }
      
      if (folder.folder_name === '기본 폴더') {
        throw new Error('기본 폴더는 삭제할 수 없습니다.');
      }
      
      const { error } = await supabase
        .from('favorite_folders')
        .delete()
        .eq('folder_id', folderId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('즐겨찾기 폴더 삭제 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 사용자의 기본 폴더 생성
   * @param {number} userId - 사용자 ID
   * @returns {Object} 생성된 기본 폴더 정보
   */
  static async createDefaultFolder(userId) {
    try {
      // 이미 기본 폴더가 있는지 확인
      const { data: existing } = await supabase
        .from('favorite_folders')
        .select('folder_id')
        .eq('user_id', userId)
        .eq('folder_name', '기본 폴더')
        .single();
      
      if (existing) {
        return existing;
      }
      
      return await this.createFolder({
        userId,
        folderName: '기본 폴더',
        description: '기본 즐겨찾기 폴더'
      });
    } catch (error) {
      console.error('기본 폴더 생성 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 사용자의 기본 폴더 조회 또는 생성
   * @param {number} userId - 사용자 ID
   * @returns {Object} 기본 폴더 정보
   */
  static async getOrCreateDefaultFolder(userId) {
    try {
      // 기본 폴더 조회
      const { data: existing, error: selectError } = await supabase
        .from('favorite_folders')
        .select('*')
        .eq('user_id', userId)
        .eq('folder_name', '기본 폴더')
        .single();
      
      if (existing) {
        return existing;
      }
      
      // 기본 폴더가 없으면 생성
      if (selectError && selectError.code === 'PGRST116') {
        return await this.createFolder({
          userId,
          folderName: '기본 폴더',
          description: '기본 즐겨찾기 폴더'
        });
      }
      
      throw selectError;
    } catch (error) {
      console.error('기본 폴더 조회/생성 오류:', error.message);
      throw error;
    }
  }
  
  // ==================== 문제 관리 ====================
  
  /**
   * 문제를 즐겨찾기에 추가
   * @param {Object} favoriteData - 즐겨찾기 데이터
   * @returns {Object} 추가된 즐겨찾기 정보
   */
  static async addQuestion(favoriteData) {
    try {
      let { userId, folderId, questionId, questionIndex } = favoriteData;
      
      // questionIndex 기본값 설정
      if (questionIndex === undefined || questionIndex === null) {
        questionIndex = 0;
      }
      
      // folderId가 없거나 유효하지 않으면 기본 폴더 사용
      if (!folderId) {
        const defaultFolder = await this.getOrCreateDefaultFolder(userId);
        folderId = defaultFolder.folder_id;
      } else {
        // folderId가 제공된 경우 해당 폴더가 존재하고 사용자 소유인지 확인
        const { data: folderCheck } = await supabase
          .from('favorite_folders')
          .select('folder_id')
          .eq('folder_id', folderId)
          .eq('user_id', userId)
          .single();
        
        if (!folderCheck) {
          // 폴더가 없으면 기본 폴더 사용
          const defaultFolder = await this.getOrCreateDefaultFolder(userId);
          folderId = defaultFolder.folder_id;
        }
      }
      
      // 문제가 실제로 존재하는지 확인
      const { data: question } = await supabase
        .from('user_questions')
        .select('user_id')
        .eq('selection_id', questionId)
        .single();
      
      if (!question) {
        throw new Error('존재하지 않는 문제입니다.');
      }
      
      // 문제 소유자 확인
      if (question.user_id !== userId) {
        throw new Error('해당 문제에 대한 권한이 없습니다.');
      }
      
      // 중복 체크 및 추가
      const { data, error } = await supabase
        .from('favorite_questions')
        .insert({
          user_id: userId,
          folder_id: folderId,
          question_id: questionId,
          question_index: questionIndex
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('이미 즐겨찾기에 추가된 문제입니다.');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('즐겨찾기 추가 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 즐겨찾기에서 문제 제거
   * @param {number} favoriteId - 즐겨찾기 ID
   * @param {number} userId - 사용자 ID (권한 확인용)
   * @returns {boolean} 삭제 성공 여부
   */
  static async removeQuestion(favoriteId, userId) {
    try {
      const { error } = await supabase
        .from('favorite_questions')
        .delete()
        .eq('favorite_id', favoriteId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('즐겨찾기 제거 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 특정 문제가 즐겨찾기에 있는지 확인
   * @param {number} userId - 사용자 ID
   * @param {number} questionId - 문제 ID
   * @param {number} questionIndex - 문제 인덱스 (선택적)
   * @returns {Object|null} 즐겨찾기 정보 또는 null
   */
  static async checkQuestion(userId, questionId, questionIndex = null) {
    try {
      let query = supabase
        .from('favorite_questions')
        .select('favorite_id, folder_id, question_index')
        .eq('user_id', userId)
        .eq('question_id', questionId);
      
      // questionIndex가 제공된 경우 해당 인덱스만 조회
      if (questionIndex !== null && questionIndex !== undefined) {
        query = query.eq('question_index', questionIndex);
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('즐겨찾기 확인 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 여러 문제가 즐겨찾기에 있는지 한 번에 확인
   * @param {number} userId - 사용자 ID
   * @param {Array} questions - 확인할 문제 목록 [{ questionId, questionIndex }]
   * @returns {Array} 각 문제의 즐겨찾기 상태
   */
  static async checkMultipleQuestions(userId, questions) {
    try {
      if (!questions || questions.length === 0) {
        return [];
      }
      
      // 모든 문제 ID 추출
      const questionIds = questions.map(q => q.questionId);
      
      // 한 번의 쿼리로 모든 즐겨찾기 조회
      const { data, error } = await supabase
        .from('favorite_questions')
        .select('question_id, question_index, favorite_id, folder_id')
        .eq('user_id', userId)
        .in('question_id', questionIds);
      
      if (error) throw error;
      
      // 결과를 Map으로 변환하여 빠른 조회
      const favoriteMap = new Map();
      if (data) {
        data.forEach(fav => {
          const key = `${fav.question_id}_${fav.question_index}`;
          favoriteMap.set(key, fav);
        });
      }
      
      // 각 문제에 대한 상태 반환
      return questions.map(q => {
        const questionIndex = q.questionIndex !== undefined ? q.questionIndex : 0;
        const key = `${q.questionId}_${questionIndex}`;
        const favorite = favoriteMap.get(key);
        
        return {
          questionId: q.questionId,
          questionIndex: questionIndex,
          isFavorite: !!favorite,
          favoriteId: favorite?.favorite_id || null,
          folderId: favorite?.folder_id || null
        };
      });
    } catch (error) {
      console.error('대량 즐겨찾기 확인 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 사용자의 모든 즐겨찾기 문제 조회
   * @param {number} userId - 사용자 ID
   * @returns {Array} 즐겨찾기 문제 목록
   */
  static async getAllQuestions(userId) {
    try {
      const { data, error } = await supabase
        .from('favorite_questions')
        .select(`
          favorite_id,
          folder_id,
          question_index,
          created_at,
          favorite_folders!inner(folder_name),
          user_questions!inner(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // 데이터 구조 변환 - question_text를 최상위로 올리고 question_type 매핑
      return data.map(item => ({
        selection_id: item.user_questions.selection_id,
        user_id: item.user_questions.user_id,
        file_name: item.user_questions.file_name,
        question_name: item.user_questions.question_name,
        question_type: mapQuestionTypeToClient(item.user_questions.question_type),
        created_at: item.user_questions.created_at,
        question_text: item.user_questions.question_data?.question_text || '{}',
        favorite_id: item.favorite_id,
        folder_id: item.folder_id,
        folder_name: item.favorite_folders.folder_name,
        question_index: item.question_index,
        favorited_at: item.created_at,
        formatted_date: formatDate(item.user_questions.created_at)
      }));
    } catch (error) {
      console.error('즐겨찾기 문제 목록 조회 오류:', error.message);
      throw error;
    }
  }
  
  /**
   * 특정 폴더의 즐겨찾기 문제 조회
   * @param {number} folderId - 폴더 ID
   * @param {number} userId - 사용자 ID
   * @returns {Object} 폴더 정보 및 문제 목록
   */
  static async getQuestionsByFolder(folderId, userId) {
    try {
      // 폴더 정보 조회
      const { data: folder, error: folderError } = await supabase
        .from('favorite_folders')
        .select('*')
        .eq('folder_id', folderId)
        .eq('user_id', userId)
        .single();
      
      if (folderError) throw folderError;
      if (!folder) throw new Error('폴더를 찾을 수 없습니다.');
      
      // 폴더의 문제 목록 조회
      const { data: questions, error: questionsError } = await supabase
        .from('favorite_questions')
        .select(`
          favorite_id,
          question_index,
          created_at,
          user_questions!inner(*)
        `)
        .eq('folder_id', folderId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (questionsError) throw questionsError;
      
      return {
        folder: {
          ...folder,
          formatted_date: formatDate(folder.created_at)
        },
        questions: questions.map(item => ({
          selection_id: item.user_questions.selection_id,
          user_id: item.user_questions.user_id,
          file_name: item.user_questions.file_name,
          question_name: item.user_questions.question_name,
          question_type: mapQuestionTypeToClient(item.user_questions.question_type),
          created_at: item.user_questions.created_at,
          question_text: item.user_questions.question_data?.question_text || '{}',
          favorite_id: item.favorite_id,
          question_index: item.question_index,
          favorited_at: item.created_at,
          formatted_date: formatDate(item.user_questions.created_at)
        }))
      };
    } catch (error) {
      console.error('폴더별 즐겨찾기 문제 조회 오류:', error.message);
      throw error;
    }
  }
}

module.exports = Favorite;
