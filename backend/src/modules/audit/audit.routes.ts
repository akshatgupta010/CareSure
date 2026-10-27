import { Router } from 'express';
import { AuditLog } from '../../models/AuditLog.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { roleGuard } from '../../middleware/roleGuard.js';

export const auditRouter = Router();

auditRouter.get('/', requireAuth, roleGuard('admin', 'reviewer'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: logs.map((log) => ({
        id: log._id.toString(),
        actorId: log.actorId,
        actorEmail: log.actorEmail,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        meta: log.meta,
        createdAt: log.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});
