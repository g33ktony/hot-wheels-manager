import mongoose, { Schema, Document } from 'mongoose';

export interface AuditLog extends Document {
  userId: string; // User who made the change
  action: string; // What was done (created, updated, deleted, etc)
  entity: string; // What was modified (Inventory, Sale, Delivery, Customer, etc)
  entityId: string; // ID of the modified entity
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  description: string; // Human-readable description
  ipAddress?: string;
  timestamp: Date;
  status: 'success' | 'error';
  errorMessage?: string;
}

const AuditLogSchema = new Schema<AuditLog>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'RESTORE_BACKUP'],
      required: true
    },
    entity: {
      type: String,
      enum: [
        'Inventory',
        'Sale',
        'Delivery',
        'Customer',
        'Supplier',
        'Purchase',
        'PreSaleItem',
        'Box',
        'PendingItem',
        'User',
        'Setting'
      ],
      required: true,
      index: true
    },
    entityId: {
      type: String,
      required: true,
      index: true
    },
    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed
      }
    ],
    description: {
      type: String,
      required: true
    },
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      // Auto-delete audit logs after 90 days
      expires: 90 * 24 * 60 * 60
    },
    status: {
      type: String,
      enum: ['success', 'error'],
      default: 'success'
    },
    errorMessage: String
  },
  {
    collection: 'audit_logs',
    timestamps: false
  }
);

// Compound index for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLogModel = mongoose.model<AuditLog>('AuditLog', AuditLogSchema);

export default AuditLogModel;
