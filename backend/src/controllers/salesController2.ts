import { Request, Response } from 'express';
import { SaleModel } from '../models/Sale';
import { InventoryItemModel } from '../models/InventoryItem';

// Get all sales
export const getSales = async (req: Request, res: Response) => {
  try {
    const sales = await SaleModel.find()
      .populate('inventoryItemId')
      .sort({ saleDate: -1 });

    res.json({
      success: true,
      data: sales,
      message: 'Ventas obtenidas exitosamente'
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
    const { inventoryItemId, salePrice, buyerInfo, notes } = req.body;

    // Verify inventory item exists and has quantity
    const inventoryItem = await InventoryItemModel.findById(inventoryItemId);
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Artículo del inventario no encontrado'
      });
    }

    if (inventoryItem.quantity <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No hay cantidad disponible para este artículo'
      });
    }

    // Create the sale
    const newSale = new SaleModel({
      inventoryItemId,
      salePrice,
      buyerInfo,
      notes
    });

    const savedSale = await newSale.save();

    // Decrease inventory quantity
    inventoryItem.quantity -= 1;
    await inventoryItem.save();

    // Populate the sale with inventory item details
    const populatedSale = await SaleModel.findById(savedSale._id)
      .populate('inventoryItemId');

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

export const getSalesStats = async (req: Request, res: Response) => {
  try {
    const stats = await SaleModel.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$salePrice' },
          averageSalePrice: { $avg: '$salePrice' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || { totalSales: 0, totalRevenue: 0, averageSalePrice: 0 },
      message: 'Estadísticas obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener las estadísticas'
    });
  }
};

export const updateSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { salePrice, buyerInfo, notes } = req.body;

    const updatedSale = await SaleModel.findByIdAndUpdate(
      id,
      { salePrice, buyerInfo, notes },
      { new: true }
    ).populate('inventoryItemId');

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

export const deleteSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sale = await SaleModel.findById(id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Venta no encontrada'
      });
    }

    // Return all items to inventory
    for (const item of sale.items) {
      if (item.inventoryItemId) {
        const inventoryItem = await InventoryItemModel.findById(item.inventoryItemId);
        if (inventoryItem) {
          inventoryItem.quantity += item.quantity;
          await inventoryItem.save();
        }
      }
    }

    const deletedSale = await SaleModel.findByIdAndDelete(id);

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
