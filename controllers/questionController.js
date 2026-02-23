import Question from '../models/questionModel.js';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';

const questionController = {
  // 생성된 문제를 DB에 저장
  async saveQuestion(req, res) {
    try {
      const { userId, fileName, questionName, questionType, questionText } = req.body;
      if (!userId || !fileName || !questionType || !questionText)
        return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: '존재하지 않는 사용자입니다.' });
      const savedQuestion = await Question.create({ userId, fileName, questionName: questionName || 'Untitled Question', questionType, questionText });
      return res.status(201).json({ success: true, message: '문제가 성공적으로 저장되었습니다.', selection_id: savedQuestion.selection_id });
    } catch (error) {
      logger.error('문제 저장 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
    }
  },

  // 사용자의 문제 목록 조회
  async getUserQuestions(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
      const questions = await Question.findByUserId(userId);
      return res.status(200).json({ success: true, count: questions.length, questions });
    } catch (error) {
      logger.error('문제 목록 조회 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 문제 상세 내용 조회
  async getQuestionDetail(req, res) {
    try {
      const { id } = req.params;
      const question = await Question.findById(id);
      if (!question) return res.status(404).json({ success: false, message: '문제를 찾을 수 없습니다.' });
      return res.status(200).json({ success: true, question });
    } catch (error) {
      logger.error('문제 상세 조회 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 문제 이름 수정 (소유자 권한 검증 포함)
  async updateQuestionName(req, res) {
    try {
      const { id } = req.params;
      const { questionName } = req.body;
      const userId = req.user.id;
      if (!questionName?.trim()) return res.status(400).json({ success: false, message: '문제 이름을 입력해주세요.' });
      const question = await Question.findById(id);
      if (!question) return res.status(404).json({ success: false, message: '문제를 찾을 수 없습니다.' });
      if (question.user_id !== userId) return res.status(403).json({ success: false, message: '해당 문제를 수정할 권한이 없습니다.' });
      const updatedQuestion = await Question.updateName(id, questionName);
      return res.status(200).json({ success: true, message: '문제 이름이 성공적으로 변경되었습니다.', question: updatedQuestion });
    } catch (error) {
      logger.error('문제 이름 변경 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 문제 삭제 (소유자 권한 검증 포함)
  async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const userId  = req.user.id;
      const question = await Question.findById(id);
      if (!question) return res.status(404).json({ success: false, message: '삭제할 문제를 찾을 수 없습니다.' });
      if (question.user_id !== userId) return res.status(403).json({ success: false, message: '해당 문제를 삭제할 권한이 없습니다.' });
      await Question.deleteById(id);
      return res.status(200).json({ success: true, message: '문제가 성공적으로 삭제되었습니다.', deletedQuestionId: id });
    } catch (error) {
      logger.error('문제 삭제 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 키워드·타입으로 문제 검색
  async searchQuestions(req, res) {
    try {
      const { userId } = req.params;
      const { query, type } = req.query;
      if (!userId) return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
      const questions = await Question.searchByUserId(userId, { query, type });
      return res.status(200).json({ success: true, count: questions.length, questions });
    } catch (error) {
      logger.error('문제 검색 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },
};

export default questionController;
