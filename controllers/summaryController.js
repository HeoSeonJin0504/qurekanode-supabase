import Summary from '../models/summaryModel.js';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';

const summaryController = {
  // 요약 결과를 DB에 저장
  async saveSummary(req, res) {
    try {
      const { userId, fileName, summaryName, summaryType, summaryText } = req.body;
      if (!userId || !fileName || !summaryType || !summaryText)
        return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: '존재하지 않는 사용자입니다.' });
      const savedSummary = await Summary.create({ userId, fileName, summaryName: summaryName || 'Untitled Summary', summaryType, summaryText });
      return res.status(201).json({ success: true, message: '요약이 성공적으로 저장되었습니다.', selection_id: savedSummary.selection_id });
    } catch (error) {
      logger.error('요약 저장 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 사용자의 요약 목록 조회
  async getUserSummaries(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
      const summaries = await Summary.findByUserId(userId);
      return res.status(200).json({ success: true, count: summaries.length, summaries });
    } catch (error) {
      logger.error('요약 목록 조회 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 요약 상세 내용 조회
  async getSummaryDetail(req, res) {
    try {
      const { id } = req.params;
      const summary = await Summary.findById(id);
      if (!summary) return res.status(404).json({ success: false, message: '요약을 찾을 수 없습니다.' });
      return res.status(200).json({ success: true, summary });
    } catch (error) {
      logger.error('요약 상세 조회 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 요약 이름 수정 (소유자 권한 검증 포함)
  async updateSummaryName(req, res) {
    try {
      const { id } = req.params;
      const { summaryName } = req.body;
      const userId = req.user.id;
      if (!summaryName?.trim()) return res.status(400).json({ success: false, message: '요약 이름을 입력해주세요.' });
      const summary = await Summary.findById(id);
      if (!summary) return res.status(404).json({ success: false, message: '요약을 찾을 수 없습니다.' });
      if (summary.user_id !== userId) return res.status(403).json({ success: false, message: '해당 요약을 수정할 권한이 없습니다.' });
      const updatedSummary = await Summary.updateName(id, summaryName);
      return res.status(200).json({ success: true, message: '요약 이름이 성공적으로 변경되었습니다.', summary: updatedSummary });
    } catch (error) {
      logger.error('요약 이름 변경 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },

  // 요약 삭제 (소유자 권한 검증 포함)
  async deleteSummary(req, res) {
    try {
      const { id } = req.params;
      const userId  = req.user.id;
      const summary = await Summary.findById(id);
      if (!summary) return res.status(404).json({ success: false, message: '삭제할 요약을 찾을 수 없습니다.' });
      if (summary.user_id !== userId) return res.status(403).json({ success: false, message: '해당 요약을 삭제할 권한이 없습니다.' });
      await Summary.deleteById(id);
      return res.status(200).json({ success: true, message: '요약이 성공적으로 삭제되었습니다.', deletedSummaryId: id });
    } catch (error) {
      logger.error('요약 삭제 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  },
};

export default summaryController;
