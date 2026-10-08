import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new OrdersController();

// KDS routes (Accessible to baristas, kitchen, managers, cashiers, admin)
router.get('/kds', requireAuth, controller.getKds.bind(controller));
router.patch('/items/:itemId/kds-status', requireAuth, controller.updateKdsItem.bind(controller));

// POS and table command routes
router.get('/', requireAuth, controller.getActive.bind(controller));
router.get('/:id', requireAuth, controller.getById.bind(controller));
router.post('/', requireAuth, controller.create.bind(controller));
router.patch('/:id/status', requireAuth, controller.updateStatus.bind(controller));

export default router;
