const Question = require('../models/questionModel');
const User = require('../models/userModel');
const logger = require('../utils/logger');
const { formatDate } = require('../utils/formatUtil');

const questionController = {
  /**
   * 새 문제 저장
   */
  async saveQuestion(req, res) {
    try {
      const { userId, fileName, questionName, questionType, questionText } = req.body;

      // 필수 입력값 검증
      if (!userId || !fileName || !questionType || !questionText) {
        return res.status(400).json({
          success: false,
          message: '필수 입력값이 누락되었습니다.'
        });
      }

      // 사용자 존재 여부 확인
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '존재하지 않는 사용자입니다.'
        });
      }

      logger.debug('문제 저장 시도:', { fileName, questionName, questionType });

      const questionData = {
        userId,
        fileName,
        questionName: questionName || 'Untitled Question',
        questionType,
        questionText
      };

      const savedQuestion = await Question.create(questionData);

      return res.status(201).json({
        success: true,
        message: '문제가 성공적으로 저장되었습니다.',
        selection_id: savedQuestion.selection_id
      });
    } catch (error) {
      logger.error('문제 저장 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error.message
      });
    }
  },

  /**
   * 사용자의 문제 목록 조회
   */
  async getUserQuestions(req, res) {
    try {
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다.'
        });
      }

      const questions = await Question.findByUserId(userId);

      return res.status(200).json({
        success: true,
        count: questions.length,
        questions: questions
      });
    } catch (error) {
      logger.error('문제 목록 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },

  /**
   * 문제 상세 조회
   */
  async getQuestionDetail(req, res) {
    try {
      const { id } = req.params;

      const question = await Question.findById(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: '문제를 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        question: question
      });
    } catch (error) {
      logger.error('문제 상세 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },

  /**
   * 문제 이름 변경
   */
  async updateQuestionName(req, res) {
    try {
      const { id } = req.params;
      const { questionName } = req.body;
      const userId = req.user.id;

      // 필수 입력값 검증
      if (!questionName || questionName.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '문제 이름을 입력해주세요.',
        });
      }

      // 문제 정보 조회
      const question = await Question.findById(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: '문제를 찾을 수 없습니다.',
        });
      }

      // 소유자 확인
      if (question.user_id !== userId) {
        logger.warn(`문제 수정 권한 없음 - 사용자 ID: ${userId}, 문제 ID: ${id}`);
        return res.status(403).json({
          success: false,
          message: '해당 문제를 수정할 권한이 없습니다.',
        });
      }

      // 이름 변경
      const updatedQuestion = await Question.updateName(id, questionName);

      logger.info(`문제 이름 변경 완료 - 문제 ID: ${id}, 새 이름: ${questionName}`);
      return res.status(200).json({
        success: true,
        message: '문제 이름이 성공적으로 변경되었습니다.',
        question: updatedQuestion,
      });
    } catch (error) {
      logger.error('문제 이름 변경 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error.message,
      });
    }
  },

  /**
   * 문제 삭제
   */
  async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const question = await Question.findById(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: '삭제할 문제를 찾을 수 없습니다.'
        });
      }

      if (question.user_id !== userId) {
        logger.warn(`문제 삭제 권한 없음 - 사용자 ID: ${userId}, 문제 ID: ${id}`);
        return res.status(403).json({
          success: false,
          message: '해당 문제를 삭제할 권한이 없습니다.'
        });
      }

      const deleted = await Question.deleteById(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: '문제 삭제 중 오류가 발생했습니다.'
        });
      }

      logger.info(`문제 삭제 완료 - 문제 ID: ${id}, 사용자 ID: ${userId}`);
      return res.status(200).json({
        success: true,
        message: '문제가 성공적으로 삭제되었습니다.',
        deletedQuestionId: id
      });
    } catch (error) {
      logger.error('문제 삭제 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
};

module.exports = questionController;