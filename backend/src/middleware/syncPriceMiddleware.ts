import { Request, Response, NextFunction } from 'express';
import { InventoryItemModel } from '../models/InventoryItem';
import { DeliveryModel } from '../models/Delivery';

/**
 * Middleware para sincronizar cambios de precio en inventario con entregas asociadas
 * Cuando se actualiza un item de inventario, sincroniza el precio en todas las entregas que contienen ese item
 */
export const syncInventoryPriceChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Solo aplicar para actualizaciones (PUT/PATCH)
    if (req.method !== 'PUT' && req.method !== 'PATCH') {
      return next();
    }

    // Capturar el ID del item siendo actualizado
    const itemId = req.params.id;
    if (!itemId) {
      return next();
    }

    // Si hay un precio nuevo en el request, guardar el valor anterior
    if (req.body && (req.body.actualPrice || req.body.suggestedPrice)) {
      const oldItem = await InventoryItemModel.findById(itemId);
      if (oldItem) {
        req.oldInventoryItem = {
          _id: oldItem._id,
          actualPrice: oldItem.actualPrice,
          suggestedPrice: oldItem.suggestedPrice
        };
      }
    }

    return next();
  } catch (error) {
    console.error('Error in syncInventoryPriceChanges middleware:', error);
    return next();
  }
};

/**
 * Después de actualizar un item de inventario, sincronizar en entregas
 */
export const applyPriceSync = async (updatedItem: any) => {
  try {
    if (!updatedItem || !updatedItem._id) {
      return;
    }

    const newPrice = updatedItem.actualPrice || updatedItem.suggestedPrice;
    if (!newPrice) {
      return;
    }

    // Encontrar todas las entregas que contienen este item
    const deliveries = await DeliveryModel.find({
      'items.inventoryItemId': updatedItem._id
    });

    if (deliveries.length === 0) {
      return;
    }

    // Actualizar el precio en cada entrega
    for (const delivery of deliveries) {
      const itemsUpdated = delivery.items.map((item: any) => {
        if (item.inventoryItemId.toString() === updatedItem._id.toString()) {
          return {
            ...item,
            unitPrice: newPrice,
            lastSyncedAt: new Date()
          };
        }
        return item;
      });

      delivery.items = itemsUpdated;
      
      // Recalcular totales de la entrega
      const newTotal = itemsUpdated.reduce((sum: number, item: any) => {
        return sum + (item.unitPrice * item.quantity);
      }, 0);
      
      delivery.totalAmount = newTotal;
      delivery.lastSyncedAt = new Date();

      await delivery.save();
    }

    console.log(`✅ Sincronizado precio de item ${updatedItem._id} en ${deliveries.length} entregas`);
  } catch (error) {
    console.error('Error applying price sync to deliveries:', error);
    // No lanzar error, solo loguear - no debe afectar la actualización original
  }
};
