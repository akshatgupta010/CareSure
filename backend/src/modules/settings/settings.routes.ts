import { Router } from 'express';
import { SettingsService } from './settings.service.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { roleGuard } from '../../middleware/roleGuard.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get('/thresholds', async (_req, res, next) => {
  try {
    const thresholds = await SettingsService.getThresholds();
    res.status(200).json({
      success: true,
      data: thresholds,
    });
  } catch (err) {
    next(err);
  }
});

settingsRouter.put('/thresholds', roleGuard('admin', 'reviewer'), async (req, res, next) => {
  try {
    const updated = await SettingsService.updateThresholds(req.body, req.user?.id, req.user?.email);
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

settingsRouter.get('/rules', async (_req, res, next) => {
  try {
    const rules = await SettingsService.getRules();
    res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (err) {
    next(err);
  }
});

settingsRouter.put('/rules', roleGuard('admin', 'reviewer'), async (req, res, next) => {
  try {
    const updated = await SettingsService.updateRules(req.body, req.user?.id, req.user?.email);
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});
