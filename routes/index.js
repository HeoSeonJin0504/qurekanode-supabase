import { Router } from 'express';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';
import aiRoutes from './aiRoutes.js';
import summaryRoutes from './summaryRoutes.js';
import questionRoutes from './questionRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';
import problemSummaryMetaRoutes from './problemSummaryMetaRoutes.js';

const router = Router();

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/summaries', summaryRoutes);
router.use('/questions', questionRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/problem-summary-meta', problemSummaryMetaRoutes);

export default router;