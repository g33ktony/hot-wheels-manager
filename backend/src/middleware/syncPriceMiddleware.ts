import { Request, Response, NextFunction } from 'express';
import { InventoryItemModel } from '../models/InventoryItem';
import { DeliveryModel } from '../models/Delivery';

/**
 * DEPRECATED: This middleware is no longer used
 * Delivery prices are fixed at creation time and should not be automatically synced with inventory prices
 */
export const syncInventoryPriceChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only applicable for updates (PUT/PATCH)
    if (req.method !== 'PUT' && req.method !== 'PATCH') {
      return next();
    }

    return next();
  } catch (error) {
    console.error('Error in syncInventoryPriceChanges middleware:', error);
    return next();
  }
};

/**
 * DEPRECATED: This function is no longer used
 * Delivery prices are fixed at creation time and should not be automatically synced
 */
export const applyPriceSync = async (updatedItem: any) => {
  // No-op function - kept for backwards compatibility
  return;
};
