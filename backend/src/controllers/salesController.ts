import { Request, Response } from 'express';
import { SaleModel } from '../models/Sale';
import { InventoryItemModel } from '../models/InventoryItem';

// Get all sales
export const getSales = async (req: Request, res: Response) => {
  try {
    const sales = await SaleModel.find()
      .populate('customerId')
      .populate('deliveryId')
      .sort({ saleDate: -1 });

    res.json({
      success: true,
      data: sales,
      message: 'Sales retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener las ventas'
    });
  }
};

// Create a new sale
export const createSale = async (req: Request, res: Response) => {
  try {
    const { items, customerId, deliveryId, paymentMethod, status, notes, totalAmount } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0 || !totalAmount) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'items y totalAmount son requeridos'
      });
    }

    // Validate and process each item
    for (const item of items) {
      if (item.inventoryItemId) {
        // Check if inventory item exists and has sufficient quantity
        const inventoryItem = await InventoryItemModel.findById(item.inventoryItemId);
        if (!inventoryItem) {
          return res.status(404).json({
            success: false,
            data: null,
            message: `Pieza de inventario no encontrada: ${item.carName}`
          });
        }
        if (inventoryItem.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `No hay stock suficiente para ${item.carName}. Disponible: ${inventoryItem.quantity}, requerido: ${item.quantity}`
          });
        }
      }
    }

    // Create the sale
    const newSale = new SaleModel({
      customerId,
      items,
      totalAmount,
      saleDate: new Date(),
      deliveryId,
      paymentMethod: paymentMethod || 'cash',
      status: status || 'pending',
      notes: notes || ''
    });

    const savedSale = await newSale.save();

    // Update inventory quantities
    for (const item of items) {
      if (item.inventoryItemId) {
        await InventoryItemModel.findByIdAndUpdate(
          item.inventoryItemId,
          { $inc: { quantity: -item.quantity } }
        );
      }
    }

    // Populate the sale with customer and delivery data
    const populatedSale = await SaleModel.findById(savedSale._id)
      .populate('customerId')
      .populate('deliveryId');

    res.status(201).json({
      success: true,
      data: populatedSale,
      message: 'Venta creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al crear la venta'
    });
  }
};

// Get sales statistics
export const getSalesStats = async (req: Request, res: Response) => {
  try {
    const totalSales = await SaleModel.countDocuments();
    const totalRevenue = await SaleModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await SaleModel.aggregate([
      {
        $match: {
          saleDate: { $gte: thisMonth }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const recentSales = await SaleModel.find()
      .populate('customerId')
      .sort({ saleDate: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalSales,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyCount: monthlyStats[0]?.count || 0,
        monthlyRevenue: monthlyStats[0]?.revenue || 0,
        recentSales
      },
      message: 'Sales statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener estadísticas de ventas'
    });
  }
};

// Update a sale
export const updateSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedSale = await SaleModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('customerId');

    if (!updatedSale) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Venta no encontrada'
      });
    }

    res.json({
      success: true,
      data: updatedSale,
      message: 'Venta actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al actualizar la venta'
    });
  }
};

// Delete a sale
export const deleteSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedSale = await SaleModel.findByIdAndDelete(id);

    if (!deletedSale) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Venta no encontrada'
      });
    }

    // Restore inventory quantities for all items in the sale
    for (const item of deletedSale.items) {
      if (item.inventoryItemId) {
        await InventoryItemModel.findByIdAndUpdate(
          item.inventoryItemId,
          { 
            $inc: { 
              quantity: item.quantity
            }
          }
        );
      }
    }

    res.json({
      success: true,
      data: deletedSale,
      message: 'Venta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al eliminar la venta'
    });
  }
};

// Create POS (Point of Sale) - Venta rápida en sitio
export const createPOSSale = async (req: Request, res: Response) => {
  try {
    const { items, paymentMethod = 'cash', notes = '' } = req.body;

    // Validar que hay items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Debe incluir al menos un artículo'
      });
    }

    console.log('🛒 POS Sale Request:', { items, paymentMethod, notes });

    const saleItems = [];
    let totalAmount = 0;

    // Procesar cada item
    for (const item of items) {
      const { inventoryItemId, customPrice } = item;

      if (!inventoryItemId) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Cada item debe tener un inventoryItemId'
        });
      }

      // Buscar el item en el inventario
      const inventoryItem = await InventoryItemModel.findById(inventoryItemId);
      
      if (!inventoryItem) {
        return res.status(404).json({
          success: false,
          data: null,
          message: `Item de inventario ${inventoryItemId} no encontrado`
        });
      }

      // Verificar que está disponible
      if (inventoryItem.status !== 'available') {
        return res.status(400).json({
          success: false,
          data: null,
          message: `El item ${inventoryItem.carName} no está disponible para venta`
        });
      }

      // Usar precio personalizado o el precio de venta del inventario
      const finalPrice = customPrice !== undefined ? customPrice : inventoryItem.salePrice;
      
      saleItems.push({
        inventoryItemId: inventoryItem._id,
        carId: inventoryItem.carId,
        carName: inventoryItem.carName,
        quantity: 1,
        unitPrice: finalPrice,
        originalPrice: inventoryItem.salePrice // Guardar el precio original
      });

      totalAmount += finalPrice;

      // Marcar el item como vendido
      inventoryItem.status = 'sold';
      inventoryItem.salePrice = finalPrice; // Actualizar con el precio final
      await inventoryItem.save();

      console.log(`✅ Item ${inventoryItem.carName} marcado como vendido por $${finalPrice}`);
    }

    // Crear la venta
    const sale = new SaleModel({
      items: saleItems,
      totalAmount,
      saleDate: new Date(),
      paymentMethod,
      status: 'completed', // Ventas POS siempre son completadas inmediatamente
      saleType: 'pos',
      notes: notes || 'Venta en sitio (POS)'
    });

    await sale.save();

    console.log('✅ POS Sale created:', sale._id);

    res.status(201).json({
      success: true,
      data: sale,
      message: `Venta completada exitosamente. Total: $${totalAmount.toFixed(2)}`
    });
  } catch (error) {
    console.error('❌ Error creating POS sale:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al crear la venta POS'
    });
  }
};
