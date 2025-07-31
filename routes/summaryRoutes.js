const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');
const { verifyToken } = require('../middlewares/authMiddleware');

// 요약 저장
router.post('/', summaryController.saveSummary);

// 사용자별 요약 목록 조회
router.get('/user/:userId', summaryController.getUserSummaries);

// 요약 상세 조회
router.get('/:id', summaryController.getSummaryDetail);

// 요약 삭제 (인증 필요)
router.delete('/:id', verifyToken, summaryController.deleteSummary);

module.exports = router;
