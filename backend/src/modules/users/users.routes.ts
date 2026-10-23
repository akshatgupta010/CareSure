import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { User } from '../../models/User.js';
import { Claim } from '../../models/Claim.js';
import { AuditLog } from '../../models/AuditLog.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

/**
 * GET /api/v1/users/me
 * Returns the currently authenticated user's profile
 */
usersRouter.get('/me', (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

/**
 * GET /api/v1/users/me/export
 * GDPR Data Portability: Exports all data associated with the user account
 */
usersRouter.get('/me/export', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).select('-passwordHash');
    const decisions = await Claim.find({ 'decisions.reviewerId': userId }, 'claimNumber decisions status');
    const auditEvents = await AuditLog.find({ actorId: userId });

    res.status(200).json({
      success: true,
      data: {
        exportedAt: new Date(),
        profile: user,
        activity: {
          decisionsRecorded: decisions,
          auditHistory: auditEvents,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});
