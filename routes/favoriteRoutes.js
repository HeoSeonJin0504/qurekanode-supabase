const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { verifyToken } = require('../middlewares/authMiddleware');

// ==================== 폴더 관리 ====================

// 사용자의 모든 즐겨찾기 폴더 조회
router.get('/folders/:userId', favoriteController.getFolders);

// 새 즐겨찾기 폴더 생성
router.post('/folders', favoriteController.createFolder);

// 사용자의 기본 폴더 조회 또는 생성
router.get('/folders/default/:userId', favoriteController.getOrCreateDefaultFolder);

// 즐겨찾기 폴더 삭제 (인증 필요)
router.delete('/folders/:folderId', favoriteController.deleteFolder);

// ==================== 문제 관리 ====================

// 문제를 즐겨찾기에 추가
router.post('/questions', favoriteController.addQuestion);

// 즐겨찾기에서 문제 제거
router.delete('/questions/:favoriteId', favoriteController.removeQuestion);

// 특정 문제가 즐겨찾기에 있는지 확인
router.get('/check/:userId/:questionId', favoriteController.checkQuestion);

// 사용자의 모든 즐겨찾기 문제 조회
router.get('/questions/all/:userId', favoriteController.getAllQuestions);

// 특정 폴더의 즐겨찾기 문제 조회
router.get('/folders/:folderId/questions/:userId', favoriteController.getQuestionsByFolder);

module.exports = router;
