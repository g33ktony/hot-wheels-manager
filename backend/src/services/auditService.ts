import { AuditLogModel } from '../models/AuditLog';
import { Request } from 'express';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'RESTORE_BACKUP';
export type AuditEntity = 
  | 'Inventory'
  | 'Sale'
  | 'Delivery'
  | 'Customer'
  | 'Supplier'
  | 'Purchase'
  | 'PreSaleItem'
  | 'Box'
  | 'PendingItem'
  | 'User'
  | 'Setting';

interface AuditChangeField {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Log an audit event
 */
export async function logAudit(
  userId: string,
  action: AuditAction,
  entity: AuditEntity,
  entityId: string,
  description: string,
  changes?: AuditChangeField[],
  ipAddress?: string,
  errorMessage?: string
) {
  try {
    await AuditLogModel.create({
      userId,
      action,
      entity,
      entityId,
      description,
      changes: changes || [],
      ipAddress,
      status: errorMessage ? 'error' : 'success',
      errorMessage,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw - audit logging failure should not break the main operation
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLog(entityId: string, entity: AuditEntity, limit = 50) {
  try {
    return await AuditLogModel.find({
      entity,
      entityId
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLog(userId: string, limit = 100) {
  try {
    return await AuditLogModel.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Error fetching user audit log:', error);
    return [];
  }
}

/**
 * Get audit logs by date range
 */
export async function getAuditLogByDateRange(
  startDate: Date,
  endDate: Date,
  entity?: AuditEntity,
  limit = 1000
) {
  try {
    const query: any = {
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    };

    if (entity) {
      query.entity = entity;
    }

    return await AuditLogModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Error fetching audit log by date range:', error);
    return [];
  }
}

/**
 * Helper to extract IP address from request
 */
export function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Helper to compare objects and extract changes
 */
export function getChanges(oldObj: any, newObj: any): AuditChangeField[] {
  const changes: AuditChangeField[] = [];

  if (!oldObj) {
    // New object - all fields are "new"
    Object.keys(newObj).forEach(key => {
      if (newObj[key] !== undefined && newObj[key] !== null) {
        changes.push({
          field: key,
          oldValue: null,
          newValue: newObj[key]
        });
      }
    });
    return changes;
  }

  // Check all fields in newObj
  Object.keys(newObj).forEach(key => {
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    // Skip timestamps and internal fields
    if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) {
      return;
    }

    // Compare values (simple comparison, works for primitives)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue
      });
    }
  });

  return changes;
}

export const auditService = {
  logAudit,
  getEntityAuditLog,
  getUserAuditLog,
  getAuditLogByDateRange,
  getClientIp,
  getChanges
};

export default auditService;
