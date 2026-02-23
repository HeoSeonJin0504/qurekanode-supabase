import { Router } from 'express';
import favoriteController from '../controllers/favoriteController.js';

const router = Router();

router.get('/folders/:userId',                     favoriteController.getFolders);
router.post('/folders',                            favoriteController.createFolder);
router.get('/folders/default/:userId',             favoriteController.getOrCreateDefaultFolder);
router.delete('/folders/:folderId',                favoriteController.deleteFolder);
router.post('/questions',                          favoriteController.addQuestion);
router.delete('/questions/:favoriteId',            favoriteController.removeQuestion);
router.post('/check-multiple/:userId',             favoriteController.checkMultipleQuestions);
router.get('/check/:userId/:questionId',           favoriteController.checkQuestion);
router.get('/questions/all/:userId',               favoriteController.getAllQuestions);
router.get('/folders/:folderId/questions/:userId', favoriteController.getQuestionsByFolder);

export default router;
