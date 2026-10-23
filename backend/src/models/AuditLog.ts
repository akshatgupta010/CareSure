import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  meta?: any;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, default: null },
    actorEmail: { type: String, default: null },
    action: { type: String, required: true },
    entity: { type: String, default: null },
    entityId: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
