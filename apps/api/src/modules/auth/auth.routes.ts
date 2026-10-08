import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/login', controller.login.bind(controller));
router.post('/pin-login', controller.pinLogin.bind(controller));
router.get('/me', requireAuth, controller.getMe.bind(controller));
router.post('/register', requireAuth, requireRole(['admin']), controller.register.bind(controller));

export default router;
