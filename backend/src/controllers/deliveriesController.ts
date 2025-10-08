import { Request, Response } from 'express';
import { DeliveryModel } from '../models/Delivery';
import { SaleModel } from '../models/Sale';
import { InventoryItemModel } from '../models/InventoryItem';
import { CustomerModel } from '../models/Customer';
import { HotWheelsCarModel } from '../models/HotWheelsCar';

// Get all deliveries
export const getDeliveries = async (req: Request, res: Response) => {
  try {
    const deliveries = await DeliveryModel.find()
      .populate('customerId')
      .populate('items.inventoryItemId')
      .sort({ scheduledDate: -1 });

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

// Get delivery by ID
export const getDeliveryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const delivery = await DeliveryModel.findById(id)
      .populate('customerId')
      .populate('items.inventoryItemId');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Entrega no encontrada'
      });
    }

    res.json({
      success: true,
      data: delivery,
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
    const { customerId, items, scheduledDate, scheduledTime, location, notes } = req.body;

    // Validate required fields
    if (!customerId || !items || items.length === 0) {
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
    let totalAmount = 0;
    for (const item of items) {
      let itemExists = false;
      
      if (item.inventoryItemId) {
        // Check if it's a real inventory item
        const inventoryItem = await InventoryItemModel.findById(item.inventoryItemId);
        if (inventoryItem) {
          itemExists = true;
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

    // Reserve inventory items
    for (const item of items) {
      if (item.inventoryItemId) {
        await InventoryItemModel.findByIdAndUpdate(
          item.inventoryItemId,
          { $inc: { reservedQuantity: item.quantity } }
        );
      }
    }

    const delivery = new DeliveryModel({
      customerId,
      customer,
      items,
      scheduledDate: scheduledDate || new Date(),
      scheduledTime,
      location,
      totalAmount,
      status: 'scheduled', // Changed from 'pending' to 'scheduled'
      notes
    });

    await delivery.save();

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
      message: 'Error al crear la entrega'
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
    delivery.items = items || delivery.items;
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

    // Don't allow deletion of completed deliveries
    if (delivery.status === 'completed') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No se puede eliminar una entrega completada'
      });
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

    // Mark as completed and create sales
    delivery.status = 'completed';
    delivery.completedDate = new Date();
    
    // Automatically mark as paid when completing the delivery (if not already fully paid)
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
        notes: 'Pago automático al completar entrega'
      } as any);
      
      // Update paid amount and status
      delivery.paidAmount = delivery.totalAmount;
    }
    
    delivery.paymentStatus = 'paid';
    
    await delivery.save();
    
    // Create sales from delivery items
    await createSalesFromDelivery(delivery);

    res.json({
      success: true,
      data: delivery,
      message: 'Entrega completada y marcada como pagada'
    });
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
      // Check if item exists in inventory or is from catalog
      let shouldRemoveFromInventory = false;
      
      if (item.inventoryItemId) {
        // Check if it's a real inventory item
        const inventoryItem = await InventoryItemModel.findById(item.inventoryItemId);
        if (inventoryItem) {
          shouldRemoveFromInventory = true;
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
        unitPrice: item.unitPrice
      });
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
      // Restore inventory for each item in the sale
      for (const saleItem of sale.items) {
        if (saleItem.inventoryItemId) {
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
