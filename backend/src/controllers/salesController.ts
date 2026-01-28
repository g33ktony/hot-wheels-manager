import { Request, Response } from 'express';
import { SaleModel } from '../models/Sale';
import { InventoryItemModel } from '../models/InventoryItem';
import { getStartOfDayUTC, getTodayString, getDayRangeUTC } from '../utils/dateUtils';
import { DeliveryModel } from '../models/Delivery';

// Get all sales
export const getSales = async (req: Request, res: Response) => {
  try {
    // Use aggregation pipeline to ensure customerId is a string
    const sales = await SaleModel.aggregate([
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          // Convert customerId to string
          customerId: { $toString: '$customerId' }
        }
      },
      {
        $sort: { saleDate: -1 }
      }
    ]);

    // Ensure all items have costPrice and profit (for backward compatibility with old sales)
    const enrichedSales = sales.map((sale: any) => {
      sale.items = sale.items.map((item: any) => {
        // If costPrice is not set, try to get it from the inventory item
        if (!item.costPrice) {
          item.costPrice = 0;
        }
        // If profit is not set, calculate it
        if (!item.profit) {
          item.profit = (item.unitPrice - (item.costPrice || 0)) * item.quantity;
        }
        return item;
      });
      
      return sale;
    });

    res.json({
      success: true,
      data: enrichedSales,
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

// Get a single sale by ID
export const getSaleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sale = await SaleModel.findById(id)
      .populate('customerId')
      .populate('deliveryId')
      .populate({
        path: 'items.inventoryItemId',
        select: 'photos purchasePrice brand carName'
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Venta no encontrada'
      });
    }

    // Ensure all items have costPrice and profit
    const saleObj = sale.toObject();
    saleObj.items = saleObj.items.map((item: any) => {
      if (!item.costPrice) {
        const inventory = item.inventoryItemId as any;
        item.costPrice = inventory?.purchasePrice || 0;
      }
      if (!item.profit) {
        item.profit = (item.unitPrice - (item.costPrice || 0)) * item.quantity;
      }
      return item;
    });

    // Convert customerId to string - handle both object and string cases
    if (saleObj.customerId) {
      const custId = saleObj.customerId as any;
      if (typeof custId === 'object' && custId._id) {
        // After populate, customerId is the customer object { _id, name, email, phone }
        saleObj.customer = custId; // Keep the full object as customer
        (saleObj.customerId as any) = custId._id.toString();
      } else if (typeof custId === 'object') {
        // It's an ObjectId object
        (saleObj.customerId as any) = custId.toString();
      }
      // else: already a string, keep as is
    }

    res.json({
      success: true,
      data: saleObj,
      message: 'Venta obtenida exitosamente'
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener la venta'
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
    const processedItems = [];
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
        
        // Calculate costPrice and profit
        const costPrice = inventoryItem.actualPrice || inventoryItem.suggestedPrice || 0;
        const profitPerUnit = item.unitPrice - costPrice;
        const totalProfit = profitPerUnit * item.quantity;
        
        processedItems.push({
          ...item,
          costPrice,
          profit: totalProfit
        });
      } else {
        // For catalog items, use provided costPrice or calculate from unitPrice
        const costPrice = item.costPrice || 0;
        const profitPerUnit = item.unitPrice - costPrice;
        const totalProfit = profitPerUnit * item.quantity;
        
        processedItems.push({
          ...item,
          costPrice,
          profit: totalProfit
        });
      }
    }

    // Create the sale
    const newSale = new SaleModel({
      customerId,
      items: processedItems,
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

    const thisMonth = getStartOfDayUTC(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

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
      const { inventoryItemId, customPrice, quantity = 1 } = item;

      console.log(`🔍 Processing item: inventoryItemId=${inventoryItemId}, customPrice=${customPrice}, quantity=${quantity}`);

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

      console.log(`📦 Found inventory item:`, {
        id: inventoryItem._id,
        quantity: inventoryItem.quantity,
        reservedQuantity: inventoryItem.reservedQuantity,
        suggestedPrice: inventoryItem.suggestedPrice,
        actualPrice: inventoryItem.actualPrice
      });

      // Verificar que hay cantidad disponible
      const availableQty = (inventoryItem.quantity || 0) - (inventoryItem.reservedQuantity || 0);
      const parsedQuantity = parseInt(String(quantity), 10) || 1;
      
      if (availableQty < parsedQuantity) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `El item de inventario solo tiene ${availableQty} unidades disponibles, se requieren ${parsedQuantity}`
        });
      }

      // Usar precio personalizado o el precio actual/sugerido del inventario
      const itemPrice = inventoryItem.actualPrice || inventoryItem.suggestedPrice || 0;
      const finalPrice = customPrice !== undefined && customPrice > 0 ? customPrice : itemPrice;
      
      if (finalPrice <= 0) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Item ${inventoryItemId} no tiene precio válido (precio: ${finalPrice})`
        });
      }
      
      // Extraer carId y carName correctamente
      // Manejar casos donde carId puede ser string o objeto
      let carIdStr: string;
      let carName: string;
      
      try {
        if (typeof inventoryItem.carId === 'object' && inventoryItem.carId !== null) {
          // carId está poblado como objeto
          carIdStr = (inventoryItem.carId as any)._id?.toString() || (inventoryItem.carId as any).toString() || '';
          carName = (inventoryItem.carId as any).name || carIdStr;
        } else if (inventoryItem.carId) {
          // carId es un string
          carIdStr = inventoryItem.carId.toString();
          carName = carIdStr; // Usar el ID como nombre si no hay metadata
        } else {
          throw new Error('Item no tiene carId válido');
        }
      } catch (parseError) {
        console.error(`❌ Error parsing carId for item ${inventoryItemId}:`, parseError);
        return res.status(400).json({
          success: false,
          data: null,
          message: `Item de inventario ${inventoryItemId} tiene datos incompletos o corruptos (carId faltante)`
        });
      }
      
      console.log(`📦 Item: carIdStr=${carIdStr}, carName=${carName}, price=${finalPrice}, quantity=${parsedQuantity}`);
      
      // Calculate cost and profit
      // The cost is the purchase price stored in the inventory item
      const costPrice = inventoryItem.purchasePrice || 0;
      const profitPerUnit = finalPrice - costPrice;
      const totalProfit = profitPerUnit * parsedQuantity;
      
      saleItems.push({
        inventoryItemId: inventoryItem._id,
        carId: carIdStr,
        carName: carName,
        quantity: parsedQuantity,
        unitPrice: finalPrice,
        originalPrice: itemPrice, // Guardar el precio original
        costPrice: costPrice,
        profit: totalProfit
      });

      totalAmount += finalPrice * parsedQuantity;

      // Reducir cantidad disponible
      inventoryItem.quantity = (inventoryItem.quantity || 0) - parsedQuantity;
      inventoryItem.actualPrice = finalPrice; // Actualizar con el precio final de venta
      await inventoryItem.save();

      console.log(`✅ Item de inventario actualizado, ${parsedQuantity} vendido(s) por $${finalPrice} c/u (Total: $${finalPrice * parsedQuantity})`);
    }

    // Crear la venta
    if (!saleItems || saleItems.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No se procesaron items válidos para la venta'
      });
    }

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'El monto total debe ser mayor a 0'
      });
    }

    const sale = new SaleModel({
      items: saleItems,
      totalAmount,
      saleDate: new Date(),
      paymentMethod: paymentMethod || 'cash',
      status: 'completed', // Ventas POS siempre son completadas inmediatamente
      saleType: 'pos',
      notes: notes || 'Venta en sitio (POS)'
    });

    console.log('📝 Sale object created, attempting to save...');
    console.log('🔍 Sale data:', {
      itemsCount: saleItems.length,
      totalAmount,
      paymentMethod,
      status: 'completed',
      saleType: 'pos'
    });

    const savedSale = await sale.save();

    console.log('✅ POS Sale created successfully:', savedSale._id);

    res.status(201).json({
      success: true,
      data: savedSale,
      message: `Venta completada exitosamente. Total: $${totalAmount.toFixed(2)}`
    });
  } catch (error) {
    console.error('❌ Error creating POS sale:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const errorDetails = error instanceof Error ? error.stack : undefined;
    
    console.error('📋 Error Details:', {
      message: errorMessage,
      stack: errorDetails,
      errorType: error?.constructor?.name
    });
    
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al crear la venta POS',
      // ALWAYS return error details for POS endpoint debugging
      error: errorMessage,
      details: errorDetails
    });
  }
};

/**
 * Obtener estadísticas detalladas de ventas con filtros
 */
export const getDetailedStatistics = async (req: Request, res: Response) => {
  try {
    const {
      startDate = getTodayString(),
      endDate = getTodayString(),
      period = 'day',
      saleType = 'all',
      brand,
      pieceType
    } = req.query;

    // Construir rango de fechas
    let dateRange: any = {
      $gte: getDayRangeUTC(startDate as string).startDate,
      $lt: getDayRangeUTC(startDate as string).endDate
    };
    
    if (period === 'month') {
      const [year, month] = (startDate as string).split('-').slice(0, 2);
      const firstDay = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0)
        .toISOString()
        .split('T')[0];
      const lastDayRange = getDayRangeUTC(lastDay);
      dateRange = {
        $gte: getDayRangeUTC(firstDay).startDate,
        $lt: new Date(lastDayRange.endDate.getTime() + 1000)
      };
    } else if (period === 'custom' && endDate) {
      const startRange = getDayRangeUTC(startDate as string);
      const endRange = getDayRangeUTC(endDate as string);
      dateRange = {
        $gte: startRange.startDate,
        $lt: endRange.endDate
      };
    }

    // Construir match query
    const matchQuery: any = {
      saleDate: dateRange,
      status: 'completed'
    };

    if (saleType !== 'all') {
      matchQuery.saleType = saleType;
    }

    // Obtener todas las ventas
    const sales = await SaleModel.find(matchQuery)
      .populate({
        path: 'items.inventoryItemId',
        select: 'brand pieceType purchasePrice'
      })
      .sort({ saleDate: -1 });

    // Procesar datos
    let totalSaleAmount = 0;
    let totalProfit = 0;
    let totalPieces = 0;
    let salesCount = 0;
    let deliverySalesCount = 0;
    let posSalesCount = 0;
    const salesByDay: { [key: string]: { amount: number; profit: number; pieces: number } } = {};
    const salesByBrand: { [key: string]: { amount: number; profit: number; pieces: number; count: number } } = {};
    const transactionsList: any[] = [];

    for (const sale of sales) {
      // Primero, verificar si la venta contiene items que coinciden con los filtros
      let saleHasMatchingItems = true;
      if (brand || pieceType) {
        saleHasMatchingItems = false;
        for (const item of sale.items) {
          const inventory = item.inventoryItemId as any;
          if (!inventory) continue;
          
          const matchesBrand = !brand || inventory.brand === brand;
          const matchesPieceType = !pieceType || inventory.pieceType === pieceType;
          
          if (matchesBrand && matchesPieceType) {
            saleHasMatchingItems = true;
            break;
          }
        }
      }

      // Si la venta no tiene items que coincidan, saltarla completamente
      if (!saleHasMatchingItems) {
        continue;
      }

      let saleTotalProfit = 0;
      let saleTotalPieces = 0;
      let saleFilteredAmount = 0;

      // Calcular ganancia y piezas por item (solo items que coinciden con filtros)
      for (const item of sale.items) {
        const inventory = item.inventoryItemId as any;
        
        // Aplicar filtros
        const matchesBrand = !brand || inventory?.brand === brand;
        const matchesPieceType = !pieceType || inventory?.pieceType === pieceType;
        
        if (!matchesBrand || !matchesPieceType) {
          continue;
        }

        const quantity = item.quantity || 1;
        const salePrice = item.unitPrice || 0;
        
        // Use profit field if available, otherwise calculate
        let itemProfit = item.profit || 0;
        if (!item.profit) {
          const cost = inventory?.purchasePrice || item.costPrice || 0;
          itemProfit = (salePrice - cost) * quantity;
        }

        saleTotalProfit += itemProfit;
        saleTotalPieces += quantity;
        saleFilteredAmount += salePrice * quantity;
      }

      const saleDate = sale.saleDate.toISOString().split('T')[0];
      
      // Acumular totales (solo items que coinciden)
      totalSaleAmount += saleFilteredAmount;
      totalProfit += saleTotalProfit;
      totalPieces += saleTotalPieces;
      salesCount++;

      if (sale.saleType === 'delivery') {
        deliverySalesCount++;
      } else if (sale.saleType === 'pos') {
        posSalesCount++;
      }

      // Ventas por día
      if (!salesByDay[saleDate]) {
        salesByDay[saleDate] = { amount: 0, profit: 0, pieces: 0 };
      }
      salesByDay[saleDate].amount += saleFilteredAmount;
      salesByDay[saleDate].profit += saleTotalProfit;
      salesByDay[saleDate].pieces += saleTotalPieces;

      // Ventas por marca (solo items que coinciden)
      for (const item of sale.items) {
        const inventory = item.inventoryItemId as any;
        if (!inventory) continue;

        const matchesBrand = !brand || inventory.brand === brand;
        const matchesPieceType = !pieceType || inventory.pieceType === pieceType;
        
        if (!matchesBrand || !matchesPieceType) {
          continue;
        }

        const itemBrand = inventory.brand || 'Sin marca';
        const quantity = item.quantity || 1;
        // Use profit field if available, otherwise calculate
        let itemProfit = item.profit || 0;
        if (!item.profit) {
          itemProfit = ((item.unitPrice || 0) - (inventory.purchasePrice || item.costPrice || 0)) * quantity;
        }

        if (!salesByBrand[itemBrand]) {
          salesByBrand[itemBrand] = { amount: 0, profit: 0, pieces: 0, count: 0 };
        }
        salesByBrand[itemBrand].amount += item.unitPrice * quantity;
        salesByBrand[itemBrand].profit += itemProfit;
        salesByBrand[itemBrand].pieces += quantity;
        salesByBrand[itemBrand].count++;
      }

      // Agregar a transacciones (solo si tiene items que coinciden)
      if (saleTotalPieces > 0) {
        transactionsList.push({
          _id: sale._id,
          customerName: (sale as any).customer?.name || 'Venta POS',
          saleDate: sale.saleDate,
          totalAmount: saleFilteredAmount,
          profit: saleTotalProfit,
          pieces: saleTotalPieces,
          saleType: sale.saleType,
          paymentMethod: sale.paymentMethod,
          itemsCount: sale.items.length
        });
      }
    }

    // Ordenar por día
    const salesByDayArray = Object.entries(salesByDay)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, data]) => ({ date, ...data }));

    // Top 5 marcas
    const topBrands = Object.entries(salesByBrand)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 5)
      .map(([brandName, data]) => ({ brand: brandName, ...data }));

    res.json({
      success: true,
      data: {
        summary: {
          totalSalesAmount: Math.round(totalSaleAmount * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          totalPieces,
          totalTransactions: salesCount,
          deliveryCount: deliverySalesCount,
          posCount: posSalesCount
        },
        period: {
          startDate,
          endDate,
          periodType: period
        },
        filters: {
          saleType: saleType !== 'all' ? saleType : null,
          brand: brand || null,
          pieceType: pieceType || null
        },
        chartData: {
          salesByDay: salesByDayArray,
          topBrands,
          saleTypeDistribution: [
            { name: 'Entregas', value: deliverySalesCount },
            { name: 'POS', value: posSalesCount }
          ]
        },
        transactions: transactionsList.sort((a, b) => 
          new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
        )
      },
      message: 'Estadísticas detalladas obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error fetching detailed statistics:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener estadísticas detalladas'
    });
  }
};

/**
 * Obtener items sin stock
 */
export const getOutOfStockItems = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    const query: any = {
      quantity: 0
    };

    if (search) {
      query.$or = [
        { carId: { $regex: search, $options: 'i' } },
        { carName: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await InventoryItemModel.find(query)
      .select('carId carName brand pieceType quantity suggestedPrice actualPrice condition')
      .sort({ dateAdded: -1 });

    res.json({
      success: true,
      data: items,
      message: `${items.length} items sin stock encontrados`
    });
  } catch (error) {
    console.error('Error fetching out-of-stock items:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener items sin stock'
    });
  }
};

/**
 * Reactivar item agregando stock
 * POST /api/sales/reactivate-item
 * Body: { itemId, quantity }
 */
export const reactivateItem = async (req: Request, res: Response) => {
  try {
    const { itemId, quantity } = req.body;

    if (!itemId || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'itemId y quantity (mayor a 0) son requeridos'
      });
    }

    const item = await InventoryItemModel.findByIdAndUpdate(
      itemId,
      { $inc: { quantity } },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Item no encontrado'
      });
    }

    res.json({
      success: true,
      data: item,
      message: `Item reactivado. Nueva cantidad: ${item.quantity}`
    });
  } catch (error) {
    console.error('Error reactivating item:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al reactivar el item'
    });
  }
};
