import { Router } from 'express';
import summaryController from '../controllers/summaryController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/',            summaryController.saveSummary);
router.get('/user/:userId', summaryController.getUserSummaries);
router.get('/:id',          summaryController.getSummaryDetail);
router.patch('/:id/name',   verifyToken, summaryController.updateSummaryName);
router.delete('/:id',       verifyToken, summaryController.deleteSummary);

export default router;
