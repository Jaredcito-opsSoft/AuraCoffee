import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
  async getDailyStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getDailyKpis();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
}
