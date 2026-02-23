import { Router } from 'express';
import problemSummaryMetaController from '../controllers/problemSummaryMetaController.js';

const router = Router();

router.get('/',    problemSummaryMetaController.getAllProblemSummaryMeta);
router.get('/:id', problemSummaryMetaController.getProblemSummaryMetaById);

export default router;