import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new InventoryController();

router.get('/items', requireAuth, controller.getItems.bind(controller));
router.post('/items', requireAuth, requireRole(['admin', 'manager']), controller.createItem.bind(controller));
router.get('/alerts', requireAuth, controller.getAlerts.bind(controller));
router.get('/movements', requireAuth, requireRole(['admin', 'manager']), controller.getMovements.bind(controller));
router.post('/items/:id/entry', requireAuth, requireRole(['admin', 'manager', 'cashier']), controller.registerEntry.bind(controller));
router.post('/items/:id/waste', requireAuth, requireRole(['admin', 'manager', 'barista']), controller.registerWaste.bind(controller));

export default router;
