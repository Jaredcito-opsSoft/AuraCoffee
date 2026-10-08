import { Router } from 'express';
import { CashController } from './cash.controller';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new CashController();

router.get('/registers', requireAuth, controller.getRegisters.bind(controller));
router.get('/current-session', requireAuth, controller.getCurrentSession.bind(controller));
router.post('/open-session', requireAuth, requireRole(['admin', 'manager', 'cashier']), controller.openSession.bind(controller));
router.post('/:sessionId/movements', requireAuth, requireRole(['admin', 'manager', 'cashier']), controller.addMovement.bind(controller));
router.get('/:sessionId/corte-x', requireAuth, requireRole(['admin', 'manager', 'cashier']), controller.getCorteX.bind(controller));
router.post('/:sessionId/close', requireAuth, requireRole(['admin', 'manager', 'cashier']), controller.closeSession.bind(controller));

export default router;
