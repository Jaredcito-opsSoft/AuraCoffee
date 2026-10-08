import { Router } from 'express';
import { ProductsController } from './products.controller';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new ProductsController();

// Public / POS authenticated routes
router.get('/categories', controller.getCategories.bind(controller));
router.get('/', controller.getProducts.bind(controller));
router.get('/:id', controller.getProductById.bind(controller));

// Manager / Admin routes
router.patch(
  '/:id/toggle-availability',
  requireAuth,
  requireRole(['admin', 'manager', 'cashier']),
  controller.toggleAvailability.bind(controller)
);
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'manager']),
  controller.createProduct.bind(controller)
);

export default router;
