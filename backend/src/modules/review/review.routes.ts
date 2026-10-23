import { Router } from 'express';
import { ReviewService } from './review.service.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const reviewRouter = Router();

reviewRouter.get(['/', '/queue'], requireAuth, async (_req, res, next) => {
  try {
    const queue = await ReviewService.getQueue();
    res.status(200).json({
      success: true,
      data: queue,
    });
  } catch (err) {
    next(err);
  }
});
