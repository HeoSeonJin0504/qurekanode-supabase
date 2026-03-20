import { Router } from 'express';
import demoController from '../controllers/demoController.js';
import { demoLimiter } from '../middlewares/rateLimiter.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/demo/topics - 사용 가능한 데모 주제 목록 (인증 불필요)
router.get('/topics', demoController.getTopics);

// POST /api/demo/summarize - 파일 없이 즉시 요약 생성
router.post('/summarize', verifyToken, demoLimiter, demoController.summarize);

// POST /api/demo/generate - 파일 없이 즉시 문제 생성
router.post('/generate', verifyToken, demoLimiter, demoController.generateQuestions);

export default router;