import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import userController from '../controllers/userController.js';

const router = Router();

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { success: false, message: '너무 많은 회원가입 시도가 있었습니다. 15분 후에 다시 시도해주세요.' },
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
});

router.post('/register',     registrationLimiter, userController.register);
router.post('/login',        userController.login);
router.post('/check-userid', userController.checkUserid);

export default router;
