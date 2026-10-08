import { Router } from 'express';
import { SalesController } from './sales.controller';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new SalesController();

router.post('/', requireAuth, requireRole(['admin', 'manager', 'cashier']), controller.processSale.bind(controller));
router.get('/', requireAuth, requireRole(['admin', 'manager', 'cashier']), controller.getRecent.bind(controller));
router.get('/:id', requireAuth, controller.getById.bind(controller));

export default router;
