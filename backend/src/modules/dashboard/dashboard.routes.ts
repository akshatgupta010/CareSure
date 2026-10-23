import { Router } from 'express';
import { DashboardService } from './dashboard.service.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const rangeDays = req.query.rangeDays ? parseInt(req.query.rangeDays as string, 10) : 30;
    const stats = await DashboardService.getStats(rangeDays);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});
