import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new DashboardController();

router.get('/kpis', requireAuth, requireRole(['admin', 'manager']), controller.getDailyStats.bind(controller));

export default router;
