const Favorite = require('../models/favoriteModel');
const logger = require('../utils/logger');

const favoriteController = {
  // ==================== 폴더 관리 ====================
  
  /**
   * 사용자의 모든 즐겨찾기 폴더 조회
   */
  async getFolders(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다.'
        });
      }
      
      let folders = await Favorite.getFoldersByUserId(userId);
      
      // 폴더가 하나도 없거나 기본 폴더가 없으면 기본 폴더 생성
      const hasDefaultFolder = folders.some(folder => folder.folder_name === '기본 폴더');
      
      if (folders.length === 0 || !hasDefaultFolder) {
        try {
          await Favorite.getOrCreateDefaultFolder(userId);
          // 폴더 목록 다시 조회
          folders = await Favorite.getFoldersByUserId(userId);
          logger.info(`기본 폴더 자동 생성 - 사용자 ID: ${userId}`);
        } catch (createError) {
          logger.error('기본 폴더 자동 생성 실패:', createError);
        }
      }
      
      return res.status(200).json({
        success: true,
        folders
      });
    } catch (error) {
      logger.error('폴더 목록 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 새 즐겨찾기 폴더 생성
   */
  async createFolder(req, res) {
    try {
      const { userId, folderName, description } = req.body;
      
      if (!userId || !folderName) {
        return res.status(400).json({
          success: false,
          message: '필수 입력값이 누락되었습니다.'
        });
      }
      
      const folder = await Favorite.createFolder({
        userId,
        folderName,
        description
      });
      
      logger.info(`즐겨찾기 폴더 생성 - 사용자 ID: ${userId}, 폴더명: ${folderName}`);
      
      return res.status(201).json({
        success: true,
        folder
      });
    } catch (error) {
      logger.error('폴더 생성 오류:', error);
      
      if (error.message === '이미 존재하는 폴더 이름입니다.') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 즐겨찾기 폴더 삭제
   */
  async deleteFolder(req, res) {
    try {
      const { folderId } = req.params;
      // 인증 토큰, body, query에서 userId 가져오기
      const userId = req.user?.id || req.body?.userId || (req.query.userId ? parseInt(req.query.userId) : null);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '사용자 인증이 필요합니다. userId를 제공해주세요.'
        });
      }
      
      await Favorite.deleteFolder(folderId, userId);
      
      logger.info(`즐겨찾기 폴더 삭제 - 폴더 ID: ${folderId}, 사용자 ID: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: '폴더가 삭제되었습니다.'
      });
    } catch (error) {
      logger.error('폴더 삭제 오류:', error);
      
      if (error.message.includes('기본 폴더')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('찾을 수 없습니다')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 사용자의 기본 폴더 조회 또는 생성
   */
  async getOrCreateDefaultFolder(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다.'
        });
      }
      
      const folder = await Favorite.getOrCreateDefaultFolder(userId);
      
      return res.status(200).json({
        success: true,
        folder
      });
    } catch (error) {
      logger.error('기본 폴더 조회/생성 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  // ==================== 문제 관리 ====================
  
  /**
   * 문제를 즐겨찾기에 추가
   */
  async addQuestion(req, res) {
    try {
      const { userId, folderId, questionId, questionIndex } = req.body;
      
      if (!userId || !questionId) {
        return res.status(400).json({
          success: false,
          message: '필수 입력값이 누락되었습니다.'
        });
      }
      
      const favorite = await Favorite.addQuestion({
        userId,
        folderId,
        questionId,
        questionIndex: questionIndex !== undefined ? questionIndex : 0
      });
      
      logger.info(`즐겨찾기 추가 - 사용자 ID: ${userId}, 문제 ID: ${questionId}, 인덱스: ${questionIndex || 0}`);
      
      return res.status(201).json({
        success: true,
        favoriteId: favorite.favorite_id,
        message: '즐겨찾기에 추가되었습니다.'
      });
    } catch (error) {
      logger.error('즐겨찾기 추가 오류:', error);
      
      if (error.message === '이미 즐겨찾기에 추가된 문제입니다.') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('존재하지 않는')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('권한')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 즐겨찾기에서 문제 제거
   */
  async removeQuestion(req, res) {
    try {
      const { favoriteId } = req.params;
      // 인증 토큰 또는 body/query에서 userId 가져오기
      const userId = req.user?.id || req.body?.userId || (req.query.userId ? parseInt(req.query.userId) : null);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '사용자 인증이 필요합니다. userId를 제공해주세요.'
        });
      }
      
      await Favorite.removeQuestion(favoriteId, userId);
      
      logger.info(`즐겨찾기 제거 - 즐겨찾기 ID: ${favoriteId}, 사용자 ID: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: '즐겨찾기에서 제거되었습니다.'
      });
    } catch (error) {
      logger.error('즐겨찾기 제거 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 특정 문제가 즐겨찾기에 있는지 확인
   */
  async checkQuestion(req, res) {
    try {
      const { userId, questionId } = req.params;
      const questionIndex = req.query.questionIndex !== undefined 
        ? parseInt(req.query.questionIndex) 
        : null;
      
      const favorite = await Favorite.checkQuestion(userId, questionId, questionIndex);
      
      if (!favorite) {
        return res.status(200).json({
          success: true,
          isFavorite: false
        });
      }
      
      return res.status(200).json({
        success: true,
        isFavorite: true,
        favoriteId: favorite.favorite_id,
        folderId: favorite.folder_id,
        questionIndex: favorite.question_index
      });
    } catch (error) {
      logger.error('즐겨찾기 확인 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 사용자의 모든 즐겨찾기 문제 조회
   */
  async getAllQuestions(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다.'
        });
      }
      
      const questions = await Favorite.getAllQuestions(userId);
      
      return res.status(200).json({
        success: true,
        questions
      });
    } catch (error) {
      logger.error('즐겨찾기 문제 목록 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 특정 폴더의 즐겨찾기 문제 조회
   */
  async getQuestionsByFolder(req, res) {
    try {
      const { folderId, userId } = req.params;
      
      if (!userId || !folderId) {
        return res.status(400).json({
          success: false,
          message: '필수 파라미터가 누락되었습니다.'
        });
      }
      
      const result = await Favorite.getQuestionsByFolder(folderId, userId);
      
      return res.status(200).json({
        success: true,
        folder: result.folder,
        questions: result.questions
      });
    } catch (error) {
      logger.error('폴더별 즐겨찾기 문제 조회 오류:', error);
      
      if (error.message.includes('찾을 수 없습니다')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
};

module.exports = favoriteController;
