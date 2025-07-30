const problemSummaryMetaService = require('../services/problemSummaryMetaService');

const problemSummaryMetaController = {
  /**
   * 모든 문제 메타데이터 조회
   */
  async getAllProblemSummaryMeta(req, res) {
    try {
      const metas = await problemSummaryMetaService.getAllProblemSummaryMeta();
      
      return res.status(200).json({
        success: true,
        count: metas.length,
        metas
      });
    } catch (error) {
      console.error('문제 메타데이터 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },
  
  /**
   * 특정 ID의 문제 메타데이터 조회
   */
  async getProblemSummaryMetaById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: '문제 ID가 필요합니다.'
        });
      }
      
      const meta = await problemSummaryMetaService.getProblemSummaryMetaById(id);
      
      if (!meta) {
        return res.status(404).json({
          success: false,
          message: '해당 ID의 문제를 찾을 수 없습니다.'
        });
      }
      
      return res.status(200).json({
        success: true,
        meta
      });
    } catch (error) {
      console.error(`문제 ID ${req.params.id} 메타데이터 조회 오류:`, error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
};

module.exports = problemSummaryMetaController;
