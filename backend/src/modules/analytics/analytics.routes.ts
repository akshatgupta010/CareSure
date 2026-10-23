import { Router } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get('/overview', async (_req, res, next) => {
  try {
    const data = await AnalyticsService.getOverview();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/evaluation', async (_req, res, next) => {
  try {
    const data = await AnalyticsService.getEvaluation();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});
