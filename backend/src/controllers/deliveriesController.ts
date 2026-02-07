import { Request, Response } from 'express';
import { DeliveryModel } from '../models/Delivery';
import { SaleModel } from '../models/Sale';
import { InventoryItemModel } from '../models/InventoryItem';
import { CustomerModel } from '../models/Customer';
import { HotWheelsCarModel } from '../models/HotWheelsCar';
import { getDayRangeUTC } from '../utils/dateUtils';

// Get all deliveries
export const getDeliveries = async (req: Request, res: Response) => {
  try {
    // Get status filter from query params
    const { status, fromDate, includeCompleted, includeUnpaidCompleted } = req.query;

    // Build filter
    const filter: any = {};
    
    // Handle status filtering
    if (status === 'pending') {
      // 'pending' means both scheduled and prepared
      filter.status = { $in: ['scheduled', 'prepared'] };
    } else if (status === 'completed') {
      // Show only completed deliveries
      filter.status = 'completed';
    } else if (status) {
      filter.status = status;
    } else if (includeCompleted !== 'true') {
      // Default: show only active deliveries (scheduled and prepared), not completed
      // unless includeCompleted is explicitly set to true
      // OR include unpaid/partial completed deliveries if requested
      if (includeUnpaidCompleted === 'true') {
        filter.$or = [
          { status: { $in: ['scheduled', 'prepared'] } },
          { 
            status: 'completed',
            paymentStatus: { $in: ['unpaid', 'partial'] }
          }
        ];
      } else {
        filter.status = { $in: ['scheduled', 'prepared'] };
      }
    }
    // else: no filter, show all deliveries (including completed)
    
    // Handle date filtering - only apply if fromDate is provided
    if (fromDate) {
      try {
        const { startDate, endDate } = getDayRangeUTC(fromDate as string);
        filter.scheduledDate = { $gte: startDate, $lte: endDate };
      } catch (e) {
        console.warn('Invalid date format:', fromDate);
      }
    }
    
    // Simplified query - remove nested populate for better performance
    const deliveries = await DeliveryModel.find(filter)
      .populate('customerId', 'name email phone') // Only populate customer
      .populate('items.inventoryItemId', 'photos purchasePrice') // Populate photos for items
      .select('-__v') // Exclude version key
      .sort({ scheduledDate: -1 })
      .lean() // Convert to plain JS objects for better performance
      .limit(200) // Limit results to prevent overload
      .maxTimeMS(8000); // Set max execution time to 8 seconds

    res.json({
      success: true,
      data: deliveries,
      message: 'Deliveries retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener las entregas'
    });
  }
};

// Get delivery statistics
export const getDeliveryStats = async (req: Request, res: Response) => {
  try {
    const stats = await DeliveryModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]).option({ maxTimeMS: 5000 });
    
    // Format stats into an object
    const formattedStats = {
      scheduled: { count: 0, totalAmount: 0 },
      prepared: { count: 0, totalAmount: 0 },
      completed: { count: 0, totalAmount: 0 },
      cancelled: { count: 0, totalAmount: 0 },
      rescheduled: { count: 0, totalAmount: 0 },
    };
    
    stats.forEach((stat: any) => {
      if (formattedStats[stat._id as keyof typeof formattedStats]) {
        formattedStats[stat._id as keyof typeof formattedStats] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        };
      }
    });
    
    res.json({
      success: true,
      data: formattedStats,
      message: 'Stats retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Get delivery by ID
export const getDeliveryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const delivery = await DeliveryModel.findById(id)
      .populate('customerId', 'name email phone')
      .populate({
        path: 'items.inventoryItemId',
        select: 'carName brand photos purchasePrice actualPrice'
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Entrega no encontrada'
      });
    }

    // Enrich items with photos and cost data from inventory
    const enrichedDelivery = delivery.toObject();
    
    console.log('🔍 DELIVERY BEFORE ENRICHMENT - First item:', {
      carName: enrichedDelivery.items[0]?.carName,
      hasPhotos: !!enrichedDelivery.items[0]?.photos,
      hasCostPrice: !!enrichedDelivery.items[0]?.costPrice,
      inventoryId: enrichedDelivery.items[0]?.inventoryItemId
    });

    enrichedDelivery.items = enrichedDelivery.items.map((item: any) => {
      const inventory = item.inventoryItemId as any;
      
      // Always set photos from inventory if available
      if (inventory?.photos && Array.isArray(inventory.photos) && inventory.photos.length > 0) {
        item.photos = inventory.photos;
      } else if (!item.photos) {
        item.photos = [];
      }
      
      // Always set costPrice from inventory purchase price
      if (inventory?.purchasePrice && inventory.purchasePrice > 0) {
        item.costPrice = inventory.purchasePrice;
      } else if (!item.costPrice) {
        item.costPrice = 0;
      }
      
      return item;
    });

    console.log('✅ DELIVERY AFTER ENRICHMENT - First item:', {
      carName: enrichedDelivery.items[0]?.carName,
      hasPhotos: !!enrichedDelivery.items[0]?.photos,
      photosCount: enrichedDelivery.items[0]?.photos?.length || 0,
      costPrice: enrichedDelivery.items[0]?.costPrice
    });

    res.json({
      success: true,
      data: enrichedDelivery,
      message: 'Delivery retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener la entrega'
    });
  }
};

// Create a new delivery
export const createDelivery = async (req: Request, res: Response) => {
  try {
    const { customerId, items, scheduledDate, scheduledTime, location, notes, forPreSale, totalAmount: requestTotalAmount } = req.body;

    console.log('📦 CREATE DELIVERY REQUEST:', {
      customerId,
      itemsCount: items?.length || 0,
      requestTotalAmount,
      forPreSale,
      location,
      scheduledDate
    });

    // Validate required fields
    // Allow empty items array if creating for PreSale (items will be added during assignment)
    if (!customerId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'customerId es requerido'
      });
    }

    if (!forPreSale && (!items || items.length === 0)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'customerId e items son requeridos'
      });
    }

    // Check if customer exists
    const customer = await CustomerModel.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Cliente no encontrado'
      });
    }

        // Validate items and calculate total
    let totalAmount = requestTotalAmount ?? 0;
    const enrichedItems = items ? [...items] : []; // Clone items array
    
    if (items && items.length > 0) {
      // Calculate from items if they exist (overrides requestTotalAmount)
      totalAmount = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let itemExists = false;
        
        // Skip validation for presale items (they start with "presale_")
        if (item.inventoryItemId?.startsWith('presale_')) {
          // Presale items are pre-validated on the frontend
          itemExists = true;
        } else if (item.inventoryItemId) {
          // Check if it's a real inventory item
          const inventoryItem = await InventoryItemModel.findById(item.inventoryItemId);
          if (inventoryItem) {
            itemExists = true;
            // Enrich item with photos and additional metadata from inventory
            enrichedItems[i] = {
              ...item,
              carId: inventoryItem.carId, // Ensure correct carId
              carName: inventoryItem.carName || `${inventoryItem.brand} - ${inventoryItem.color || 'Unknown'}`, // Use real carName
              brand: inventoryItem.brand,
              color: inventoryItem.color,
              photos: inventoryItem.photos || [],
              primaryPhotoIndex: inventoryItem.primaryPhotoIndex || 0,
              costPrice: inventoryItem.purchasePrice || 0 // Save cost price from inventory
            };
            // Validate available quantity for real inventory items (quantity - reservedQuantity)
            const availableQuantity = inventoryItem.quantity - (inventoryItem.reservedQuantity || 0);
            if (availableQuantity < item.quantity) {
              return res.status(400).json({
                success: false,
                data: null,
                message: `Cantidad insuficiente para el artículo ${inventoryItem.carId}: disponible ${availableQuantity}, solicitado ${item.quantity}`
              });
            }
          }
        } else if (item.hotWheelsCarId) {
          // Check if it's a catalog item
          const hotWheelsCar = await HotWheelsCarModel.findById(item.hotWheelsCarId);
          if (hotWheelsCar) {
            itemExists = true;
          }
        }
        
        if (!itemExists) {
          return res.status(404).json({
            success: false,
            data: null,
            message: `Pieza no encontrada: ${item.inventoryItemId || item.hotWheelsCarId}`
          });
        }
        
        totalAmount += item.unitPrice * item.quantity;
      }
    }

    // Reserve inventory items (skip presale items)
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.inventoryItemId && !item.inventoryItemId.startsWith('presale_')) {
          await InventoryItemModel.findByIdAndUpdate(
            item.inventoryItemId,
            { $inc: { reservedQuantity: item.quantity } }
          );
        }
      }
    }

    const resolvedLocation = location || 'Por definir';
    const resolvedTotalAmount = totalAmount ?? 0;
    const hasPresaleItems = !!forPreSale || (items && items.some((item: any) => item.inventoryItemId?.startsWith('presale_')));

    // Handle scheduledDate - parse correctly if it's a string
    let parsedScheduledDate: Date;
    if (scheduledDate && typeof scheduledDate === 'string') {
      // If it's a date string like "2026-01-24", parse it as local date
      const { startDate } = getDayRangeUTC(scheduledDate);
      parsedScheduledDate = startDate;
    } else if (scheduledDate) {
      // If it's already a Date object, use it as is
      parsedScheduledDate = new Date(scheduledDate);
    } else {
      // Default to today at midnight UTC
      const today = new Date();
      const { startDate } = getDayRangeUTC(today.toISOString().split('T')[0]);
      parsedScheduledDate = startDate;
    }

    console.log('📦 DELIVERY CREATION DETAILS:', {
      calculatedTotalAmount: totalAmount,
      resolvedTotalAmount,
      hasPresaleItems,
      location: resolvedLocation,
      scheduledDate: parsedScheduledDate.toISOString()
    });

    const delivery = new DeliveryModel({
      customerId,
      customer,
      items: enrichedItems,
      scheduledDate: parsedScheduledDate,
      scheduledTime,
      location: resolvedLocation,
      totalAmount: resolvedTotalAmount,
      status: 'scheduled', // Changed from 'pending' to 'scheduled'
      notes,
      hasPresaleItems
    });

    await delivery.save();

    console.log('✅ DELIVERY SAVED:', {
      _id: delivery._id,
      totalAmount: delivery.totalAmount,
      paidAmount: delivery.paidAmount,
      paymentStatus: delivery.paymentStatus
    });

    res.status(201).json({
      success: true,
      data: delivery,
      message: 'Entrega creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al crear la entrega',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Update delivery
export const updateDelivery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerId, items, scheduledDate, scheduledTime, location, status, notes } = req.body;

    const delivery = await DeliveryModel.findById(id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Entrega no encontrada'
      });
    }

    // If status is changing to completed, create sales automatically
    if (status === 'completed' && delivery.status !== 'completed') {
      await createSalesFromDelivery(delivery);
    }

    delivery.customerId = customerId || delivery.customerId;
    
    // Enrich items with photos if they're being updated
    let enrichedItems = delivery.items;
    if (items) {
      enrichedItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let enrichedItem = { ...item };

        // If item doesn't have photos, try to get them from inventory
        if ((!enrichedItem.photos || enrichedItem.photos.length === 0) && item.inventoryItemId && !item.inventoryItemId.startsWith('presale_')) {
          const inventoryItem = await InventoryItemModel.findById(item.inventoryItemId);
          if (inventoryItem) {
            enrichedItem.photos = inventoryItem.photos || [];
            enrichedItem.primaryPhotoIndex = inventoryItem.primaryPhotoIndex || 0;
            enrichedItem.costPrice = inventoryItem.purchasePrice || 0;
          }
        }
        enrichedItems.push(enrichedItem);
      }
    }
    
    delivery.items = enrichedItems;
    delivery.scheduledDate = scheduledDate || delivery.scheduledDate;
    delivery.scheduledTime = scheduledTime || delivery.scheduledTime;
    delivery.location = location || delivery.location;
    delivery.status = status || delivery.status;
    delivery.notes = notes || delivery.notes;

    // Recalculate total if items changed
    if (items) {
      delivery.totalAmount = items.reduce((total: number, item: any) => total + (item.unitPrice * item.quantity), 0);
      
      // Recalculate payment status when items change
      const totalPaid = delivery.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const remainingAmount = delivery.totalAmount - totalPaid;
      
      if (Math.abs(remainingAmount) < 0.01) {
        // Fully paid (within 1 cent tolerance)
        delivery.paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        // Partially paid (includes overpaid cases)
        delivery.paymentStatus = 'partial';
      } else {
        // No payments made
        delivery.paymentStatus = 'pending';
      }
      
      // If items changed and delivery was prepared, change status back to scheduled
      // because new items need to be prepared
      if (delivery.status === 'prepared') {
        delivery.status = 'scheduled';
      }
    }

    await delivery.save();

    res.json({
      success: true,
      data: delivery,
      message: 'Entrega actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating delivery:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al actualizar la entrega'
    });
  }
};

// Delete delivery
export const deleteDelivery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const delivery = await DeliveryModel.findById(id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Entrega no encontrada'
      });
    }

    // If completed, also delete related sales and restore inventory properly
    if (delivery.status === 'completed') {
      // Find and delete sales created from this delivery
      const sales = await SaleModel.find({ deliveryId: delivery._id });
      
      for (const sale of sales) {
        // Restore inventory for each item in the sale (only non-presale items)
        for (const saleItem of sale.items) {
          const itemId = saleItem.inventoryItemId?.toString() || '';
          if (itemId && !itemId.startsWith('presale_')) {
            const inventoryItem = await InventoryItemModel.findById(saleItem.inventoryItemId);
            if (inventoryItem) {
              // Restore inventory quantity
              await InventoryItemModel.findByIdAndUpdate(
                saleItem.inventoryItemId,
                { $inc: { quantity: saleItem.quantity } }
              );
            }
          }
        }
        
        // Delete the sale
        await SaleModel.findByIdAndDelete(sale._id);
      }

      console.log(`Deleted ${sales.length} sales from delivery ${delivery._id}`);
    }

    // Release reserved inventory items
    for (const item of delivery.items) {
      if (item.inventoryItemId) {
        await InventoryItemModel.findByIdAndUpdate(
          item.inventoryItemId,
          { $inc: { reservedQuantity: -item.quantity } }
        );
      }
    }

    await DeliveryModel.findByIdAndDelete(id);

    res.json({
      success: true,
      data: null,
      message: 'Entrega eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al eliminar la entrega'
    });
  }
};

// Mark delivery as completed
export const markDeliveryAsCompleted = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body; // 'unpaid', 'partial', or 'paid'

    const delivery = await DeliveryModel.findById(id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Entrega no encontrada'
      });
    }

    // Check if already completed
    if (delivery.status === 'completed') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'La entrega ya está completada'
      });
    }

    // Mark as completed
    delivery.status = 'completed';
    delivery.completedDate = new Date();
    
    // Handle payment status
    if (paymentStatus === 'paid') {
      // If marking as fully paid, auto-complete remaining amount (if any)
      const currentPaidAmount = delivery.paidAmount || 0;
      if (currentPaidAmount < delivery.totalAmount) {
        const remainingAmount = delivery.totalAmount - currentPaidAmount;
        
        // Initialize payments array if it doesn't exist
        if (!delivery.payments) {
          delivery.payments = [];
        }
        
        // Add automatic payment for remaining amount
        delivery.payments.push({
          amount: remainingAmount,
          paymentDate: new Date(),
          paymentMethod: 'cash',
          notes: 'Pago registrado al entregar'
        } as any);
        
        // Update paid amount
        delivery.paidAmount = delivery.totalAmount;
      }
      
      delivery.paymentStatus = 'paid';
      
      await delivery.save();
      
      // Create sales ONLY if fully paid
      await createSalesFromDelivery(delivery);
      
      return res.json({
        success: true,
        data: delivery,
        message: 'Entrega completada y marcada como pagada. Venta creada.'
      });
    } else {
      // For 'unpaid' or 'partial' or no explicit status, just mark as completed without auto-payment
      // Keep the current paymentStatus
      
      await delivery.save();
      
      return res.json({
        success: true,
        data: delivery,
        message: `Entrega completada. Pago: ${delivery.paymentStatus}`
      });
    }
  } catch (error) {
    console.error('Error marking delivery as completed:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al completar la entrega'
    });
  }
};

// Mark delivery as pending
export const markDeliveryAsPending = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const delivery = await DeliveryModel.findById(id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Entrega no encontrada'
      });
    }

    // Check if already pending
    if (delivery.status === 'scheduled') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'La entrega ya está pendiente'
      });
    }

    // Don't allow reverting completed deliveries
    if (delivery.status === 'completed') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No se puede revertir una entrega completada. Los items ya fueron vendidos.'
      });
    }

    // Mark as pending and remove completion date
    delivery.status = 'scheduled';
    delivery.completedDate = undefined;
    
    // Reset payment status when reverting to pending
    // Keep manual payments if any were made before completion
    // Remove only the automatic payment made during completion
    if (delivery.payments && delivery.payments.length > 0) {
      const lastPayment = delivery.payments[delivery.payments.length - 1];
      if (lastPayment.notes === 'Pago automático al completar entrega') {
        delivery.payments.pop();
        delivery.paidAmount = (delivery.paidAmount || 0) - lastPayment.amount;
      }
    }
    
    // Recalculate payment status
    if (delivery.paidAmount >= delivery.totalAmount) {
      delivery.paymentStatus = 'paid';
    } else if (delivery.paidAmount > 0) {
      delivery.paymentStatus = 'partial';
    } else {
      delivery.paymentStatus = 'pending';
    }
    
    await delivery.save();
    
    // Remove sales created from this delivery and restore inventory
    await removeSalesFromDelivery(delivery);

    res.json({
      success: true,
      data: delivery,
      message: 'Entrega vuelta a pendiente'
    });
  } catch (error) {
    console.error('Error marking delivery as pending:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al volver entrega a pendiente'
    });
  }
};

// Helper function to create sales when delivery is completed
const createSalesFromDelivery = async (delivery: any) => {
  try {
    // Create sale items from delivery items
    const saleItems = [];

    for (const item of delivery.items) {
      // Skip presale items - they are handled separately by PreSalePaymentPlan
      if (item.inventoryItemId?.startsWith('presale_')) {
        continue; // Don't create sale items for presale items
      }
      
      // Check if item exists in inventory or is from catalog
      let shouldRemoveFromInventory = false;
      let photos = item.photos || []; // Default to item photos from delivery
      let primaryPhotoIndex = item.primaryPhotoIndex || 0; // Default to delivery item value
      let costPrice = item.costPrice || 0; // Default to delivery item value

      if (item.inventoryItemId) {
        // Check if it's a real inventory item (not presale)
        const inventoryItem = await InventoryItemModel.findById(item.inventoryItemId);
        if (inventoryItem) {
          shouldRemoveFromInventory = true;
          // Get photos from inventory only if not already in delivery item (fallback for old deliveries)
          if (!photos || photos.length === 0) {
            photos = inventoryItem.photos || [];
            primaryPhotoIndex = inventoryItem.primaryPhotoIndex || 0;
          }
          // Get costPrice from inventory only if not already in delivery item (fallback for old deliveries)
          if (costPrice === 0) {
            costPrice = inventoryItem.purchasePrice || 0;
          }
          // First release the reservation, then remove from inventory completely
          await InventoryItemModel.findByIdAndUpdate(
            item.inventoryItemId,
            {
              $inc: {
                reservedQuantity: -item.quantity,
                quantity: -item.quantity
              }
            }
          );
        }
      }
      // For catalog items (hotWheelsCarId), don't modify any inventory

      // Add item to sale items
      saleItems.push({
        inventoryItemId: item.inventoryItemId || null, // Only set for real inventory items
        hotWheelsCarId: item.hotWheelsCarId || null, // For catalog items
        carId: item.carId,
        carName: item.carName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: costPrice,
        profit: item.profit || (item.unitPrice - costPrice) * item.quantity,
        photos: photos, // Include photos from delivery item or inventory
        primaryPhotoIndex: primaryPhotoIndex // Include primary photo index
      });
    }
    
    // Only create a sale if there are non-presale items
    if (saleItems.length === 0) {
      console.log(`No non-presale items in delivery ${delivery._id}, skipping sale creation`);
      return;
    }

    // Create single sale record with all items
    const sale = new SaleModel({
      customerId: delivery.customerId,
      customer: delivery.customer,
      items: saleItems,
      totalAmount: delivery.totalAmount,
      saleDate: new Date(),
      deliveryId: delivery._id,
      delivery: {
        id: delivery._id,
        scheduledDate: delivery.scheduledDate,
        location: delivery.location
      },
      paymentMethod: 'cash', // Default, can be updated later
      status: 'completed',
      notes: `Venta generada automáticamente desde entrega ${delivery._id}`
    });

    await sale.save();

    console.log(`Created 1 sale with ${saleItems.length} items from delivery ${delivery._id}`);
  } catch (error) {
    console.error('Error creating sales from delivery:', error);
    throw error;
  }
};

const removeSalesFromDelivery = async (delivery: any) => {
  try {
    // Find and delete sales created from this delivery
    const sales = await SaleModel.find({ deliveryId: delivery._id });
    
    for (const sale of sales) {
      // Restore inventory for each item in the sale (only non-presale items)
      for (const saleItem of sale.items) {
        const itemId = saleItem.inventoryItemId?.toString() || '';
        if (itemId && !itemId.startsWith('presale_')) {
          const inventoryItem = await InventoryItemModel.findById(saleItem.inventoryItemId);
          if (inventoryItem) {
            // Restore inventory quantity
            await InventoryItemModel.findByIdAndUpdate(
              saleItem.inventoryItemId,
              { $inc: { quantity: saleItem.quantity } }
            );
          }
        }
        // Presale items don't need restoration - they are managed separately
      }
      
      // Delete the sale
      await SaleModel.findByIdAndDelete(sale._id);
    }

    console.log(`Removed ${sales.length} sales from delivery ${delivery._id}`);
  } catch (error) {
    console.error('Error removing sales from delivery:', error);
    throw error;
  }
};

// Mark delivery as prepared
export const markDeliveryAsPrepared = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const delivery = await DeliveryModel.findById(id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Entrega no encontrada'
      });
    }

    // Check if already prepared or completed
    if (delivery.status === 'prepared') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'La entrega ya está preparada'
      });
    }

    if (delivery.status === 'completed') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No se puede marcar como preparada una entrega completada'
      });
    }

    // Mark as prepared
    delivery.status = 'prepared';
    
    await delivery.save();

    res.json({
      success: true,
      data: delivery,
      message: 'Entrega marcada como preparada'
    });
  } catch (error) {
    console.error('Error marking delivery as prepared:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al marcar entrega como preparada'
    });
  }
};
