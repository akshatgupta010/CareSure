import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

export interface AuditLogParams {
  actorId?: string;
  actorEmail?: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, any>;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await AuditLog.create({
      actorId: params.actorId || null,
      actorEmail: params.actorEmail || null,
      action: params.action,
      entity: params.entity || null,
      entityId: params.entityId || null,
      meta: params.meta || null,
    });
  } catch (error) {
    logger.error('Failed to write audit log entry:', error);
  }
}
