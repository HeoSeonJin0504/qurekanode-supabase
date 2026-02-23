import { Router } from 'express';
import jwt from 'jsonwebtoken';
import authController from '../controllers/authController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import logger from '../utils/logger.js';

const router = Router();

router.post('/refresh-token', authController.refreshToken);

router.post('/logout', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.ACCESS_TOKEN_SECRET);
    } catch {
      logger.debug('로그아웃 처리 중 - 유효하지 않은 토큰');
    }
  }
  next();
}, authController.logout);

router.get('/verify', verifyToken, (req, res) => {
  res.status(200).json({ success: true, message: '토큰이 유효합니다.', user: { id: req.user.id, userid: req.user.userid, name: req.user.name, rememberMe: req.user.rememberMe || false } });
});

export default router;
