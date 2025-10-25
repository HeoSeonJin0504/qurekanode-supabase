const Summary = require('../models/summaryModel');
const User = require('../models/userModel');
const logger = require('../utils/logger');
const { formatDate } = require('../utils/formatUtil');

const summaryController = {
  /**
   * 새 요약 저장
   */
  async saveSummary(req, res) {
    try {
      const { userId, fileName, summaryName, summaryType, summaryText } = req.body;

      // 필수 입력값 검증
      if (!userId || !fileName || !summaryType || !summaryText) {
        return res.status(400).json({
          success: false,
          message: '필수 입력값이 누락되었습니다.',
        });
      }

      // 사용자 존재 여부 확인
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '존재하지 않는 사용자입니다.',
        });
      }

      logger.debug('요약 저장 시도:', { fileName, summaryName, summaryType });

      // 요약 정보 저장
      const summaryData = {
        userId,
        fileName,
        summaryName: summaryName || 'Untitled Summary',
        summaryType,
        summaryText,
      };

      const savedSummary = await Summary.create(summaryData);

      return res.status(201).json({
        success: true,
        message: '요약이 성공적으로 저장되었습니다.',
        selection_id: savedSummary.selection_id,
      });
    } catch (error) {
      logger.error('요약 저장 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
      });
    }
  },

  /**
   * 사용자의 모든 요약 목록 조회
   */
  async getUserSummaries(req, res) {
    try {
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다.',
        });
      }

      const summaries = await Summary.findByUserId(userId);

      return res.status(200).json({
        success: true,
        count: summaries.length,
        summaries: summaries,
      });
    } catch (error) {
      logger.error('요약 목록 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
      });
    }
  },

  /**
   * 특정 요약 상세 조회
   */
  async getSummaryDetail(req, res) {
    try {
      const { id } = req.params;

      const summary = await Summary.findById(id);

      if (!summary) {
        return res.status(404).json({
          success: false,
          message: '요약을 찾을 수 없습니다.',
        });
      }

      return res.status(200).json({
        success: true,
        summary: summary,
      });
    } catch (error) {
      logger.error('요약 상세 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
      });
    }
  },

  /**
   * 요약 삭제
   */
  async deleteSummary(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // 인증 미들웨어에서 설정한 사용자 ID

      // 요약 정보 조회
      const summary = await Summary.findById(id);

      if (!summary) {
        return res.status(404).json({
          success: false,
          message: '삭제할 요약을 찾을 수 없습니다.',
        });
      }

      // 소유자 확인 - user_id 속성명 사용 (데이터베이스 컬럼명과 일치)
      if (summary.user_id !== userId) {
        logger.warn(`요약 삭제 권한 없음 - 사용자 ID: ${userId}, 요약 ID: ${id}`);
        return res.status(403).json({
          success: false,
          message: '해당 요약을 삭제할 권한이 없습니다.',
        });
      }

      // 요약 삭제
      const deleted = await Summary.deleteById(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: '요약 삭제 중 오류가 발생했습니다.',
        });
      }

      logger.info(`요약 삭제 완료 - 요약 ID: ${id}, 사용자 ID: ${userId}`);
      return res.status(200).json({
        success: true,
        message: '요약이 성공적으로 삭제되었습니다.',
        deletedSummaryId: id,
      });
    } catch (error) {
      logger.error('요약 삭제 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
      });
    }
  },
};

module.exports = summaryController;