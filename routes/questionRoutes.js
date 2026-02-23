import { Router } from 'express';
import questionController from '../controllers/questionController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/',              questionController.saveQuestion);
router.get('/user/:userId',   questionController.getUserQuestions);
router.get('/:id',            questionController.getQuestionDetail);
router.patch('/:id/name',     verifyToken, questionController.updateQuestionName);
router.delete('/:id',         verifyToken, questionController.deleteQuestion);

export default router;
