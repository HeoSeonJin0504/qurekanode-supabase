import { Router } from 'express';
import userController from '../controllers/userController.js';
import { registerLimiter as registrationLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/register',     registrationLimiter, userController.register);
router.post('/login',        userController.login);
router.post('/check-userid', userController.checkUserid);

export default router;
