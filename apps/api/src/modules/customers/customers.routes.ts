import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { requireAuth } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new CustomersController();

router.get('/search', requireAuth, controller.search.bind(controller));
router.post('/', requireAuth, controller.create.bind(controller));
router.get('/:id', requireAuth, controller.getById.bind(controller));
router.post('/:id/redeem', requireAuth, controller.redeem.bind(controller));

export default router;
