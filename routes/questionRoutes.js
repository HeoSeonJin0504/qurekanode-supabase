const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { verifyToken } = require('../middlewares/authMiddleware');

// 문제 저장
router.post('/', questionController.saveQuestion);

// 사용자별 문제 목록 조회
router.get('/user/:userId', questionController.getUserQuestions);

// 문제 상세 조회
router.get('/:id', questionController.getQuestionDetail);

// 문제 삭제 (인증 필요)
router.delete('/:id', verifyToken, questionController.deleteQuestion);

module.exports = router;
