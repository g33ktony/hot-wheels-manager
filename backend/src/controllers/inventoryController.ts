import { Request, Response } from 'express';
import { InventoryItemModel } from '../models/InventoryItem';
import { HotWheelsCarModel } from '../models/HotWheelsCar';
import { IHotWheelsCar } from '../models/HotWheelsCar';
import { calculateDefaultSeriesPrice } from '../utils/seriesHelpers';

// Get inventory items
export const getInventoryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000; // Increased default limit
    const skip = (page - 1) * limit;

    // First check if we have any inventory items
    const inventoryCount = await InventoryItemModel.countDocuments();
    
    if (inventoryCount === 0) {
      // If no inventory, show some sample Hot Wheels from our catalog
      const sampleCars = await HotWheelsCarModel.find()
        .limit(limit)
        .skip(skip)
        .sort({ year: -1 });
      
      const total = await HotWheelsCarModel.countDocuments();
      
      // Transform catalog items to look like inventory items
      const inventoryItems = sampleCars.map((car: IHotWheelsCar) => ({
        _id: car._id,
        carId: car.toy_num,
        quantity: 0,
        reservedQuantity: 0,
        purchasePrice: 0,
        suggestedPrice: 5.00,
        condition: 'mint',
        notes: 'From catalog - not yet in inventory',
        dateAdded: new Date(),
        hotWheelsCar: {
          toy_num: car.toy_num,
          model: car.carModel,
          series: car.series,
          year: car.year,
          color: car.color,
          photo_url: car.photo_url
        }
      }));

      res.json({
        success: true,
        data: {
          items: inventoryItems,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit
          }
        },
        message: 'Showing catalog items (no inventory yet)'
      });
      return;
    }

    // Get actual inventory items
    const inventoryItems = await InventoryItemModel.find()
      .limit(limit)
      .skip(skip)
      .sort({ dateAdded: -1 });

    const total = await InventoryItemModel.countDocuments();

    res.json({
      success: true,
      data: {
        items: inventoryItems,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Error getting inventory items:', error);
    res.status(500).json({ error: 'Error fetching inventory items' });
  }
};

// Add inventory item
export const addInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      carId, quantity, purchasePrice, suggestedPrice, condition, notes,
      seriesId, seriesName, seriesSize, seriesPosition, seriesPrice,
      brand, pieceType, isTreasureHunt, isSuperTreasureHunt, isChase
    } = req.body;

    // Validate required fields
    if (!carId || quantity === undefined || purchasePrice === undefined || suggestedPrice === undefined) {
      res.status(400).json({ 
        success: false,
        error: 'Missing required fields: carId, quantity, purchasePrice, suggestedPrice' 
      });
      return;
    }

    // Calculate default series price if this is part of a series
    let seriesDefaultPrice: number | undefined
    let finalSeriesPrice: number | undefined

    if (seriesId && seriesSize) {
      // Calculate 85% of individual total as default
      seriesDefaultPrice = calculateDefaultSeriesPrice(suggestedPrice, seriesSize)
      // Use provided seriesPrice or default
      finalSeriesPrice = seriesPrice || seriesDefaultPrice
    }

    // Check if this car is already in inventory
    const existingItem = await InventoryItemModel.findOne({ carId });
    
    if (existingItem) {
      // Update existing item quantity
      existingItem.quantity += quantity;
      if (notes) {
        existingItem.notes = notes;
      }
      
      // Update series info if provided
      if (seriesId) {
        existingItem.seriesId = seriesId
        existingItem.seriesName = seriesName
        existingItem.seriesSize = seriesSize
        existingItem.seriesPosition = seriesPosition
        existingItem.seriesPrice = finalSeriesPrice
        existingItem.seriesDefaultPrice = seriesDefaultPrice
      }
      
      await existingItem.save();
      
      res.json({
        success: true,
        data: existingItem
      });
    } else {
      // Create new inventory item
      const inventoryItem = new InventoryItemModel({
        carId,
        quantity,
        purchasePrice,
        suggestedPrice,
        condition: condition || 'mint',
        notes: notes || '',
        dateAdded: new Date(),
        // Brand and type fields
        brand,
        pieceType,
        isTreasureHunt: isTreasureHunt || false,
        isSuperTreasureHunt: isSuperTreasureHunt || false,
        isChase: isChase || false,
        // Series fields
        ...(seriesId && {
          seriesId,
          seriesName,
          seriesSize,
          seriesPosition,
          seriesPrice: finalSeriesPrice,
          seriesDefaultPrice
        })
      });

      await inventoryItem.save();
      
      res.status(201).json({
        success: true,
        data: inventoryItem
      });
    }
  } catch (error) {
    console.error('Error adding inventory item:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error adding inventory item' 
    });
  }
};

// Update inventory item
export const updateInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If updating series info, recalculate default price
    if (updates.seriesId && updates.seriesSize && updates.suggestedPrice) {
      const seriesDefaultPrice = calculateDefaultSeriesPrice(updates.suggestedPrice, updates.seriesSize)
      updates.seriesDefaultPrice = seriesDefaultPrice
      
      // Use provided seriesPrice or default
      if (!updates.seriesPrice) {
        updates.seriesPrice = seriesDefaultPrice
      }
    }

    const inventoryItem = await InventoryItemModel.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!inventoryItem) {
      res.status(404).json({ 
        success: false,
        error: 'Inventory item not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: inventoryItem
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error updating inventory item' 
    });
  }
};

// Delete inventory item
export const deleteInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const inventoryItem = await InventoryItemModel.findByIdAndDelete(id);

    if (!inventoryItem) {
      res.status(404).json({ 
        success: false,
        error: 'Inventory item not found' 
      });
      return;
    }

    res.json({ 
      success: true,
      message: 'Inventory item deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error deleting inventory item' 
    });
  }
};

// Search Hot Wheels catalog
export const searchHotWheelsCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: query, year, series, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const searchFilter: any = {};
    
    if (query) {
      searchFilter.$or = [
        { model: { $regex: query, $options: 'i' } },
        { series: { $regex: query, $options: 'i' } },
        { color: { $regex: query, $options: 'i' } },
        { toy_num: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (year) {
      searchFilter.year = year as string;
    }
    
    if (series) {
      searchFilter.series = { $regex: series, $options: 'i' };
    }

    const cars = await HotWheelsCarModel.find(searchFilter)
      .limit(parseInt(limit as string))
      .skip(skip)
      .sort({ year: -1, model: 1 });

    const total = await HotWheelsCarModel.countDocuments(searchFilter);

    res.json({
      success: true,
      data: {
        cars,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
          totalItems: total,
          itemsPerPage: parseInt(limit as string)
        }
      }
    });
  } catch (error) {
    console.error('Error searching catalog:', error);
    res.status(500).json({ error: 'Error searching Hot Wheels catalog' });
  }
};

// ========== SERIES ENDPOINTS ==========

// Get all items from a series
export const getSeriesItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId } = req.params;

    const items = await InventoryItemModel.find({ seriesId }).sort({ seriesPosition: 1 });

    if (!items || items.length === 0) {
      res.status(404).json({ 
        success: false, 
        message: `No se encontraron piezas con seriesId: ${seriesId}` 
      });
      return;
    }

    res.json({
      success: true,
      data: {
        seriesId,
        seriesName: items[0].seriesName,
        seriesSize: items[0].seriesSize,
        seriesPrice: items[0].seriesPrice,
        items
      }
    });
  } catch (error) {
    console.error('Error getting series items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener piezas de la serie' 
    });
  }
};

// Check if a complete series is available in inventory
export const checkSeriesAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId } = req.params;

    const items = await InventoryItemModel.find({ seriesId }).sort({ seriesPosition: 1 });

    if (!items || items.length === 0) {
      res.json({
        success: true,
        data: {
          available: false,
          reason: 'series_not_found',
          message: 'Serie no encontrada'
        }
      });
      return;
    }

    const seriesSize = items[0].seriesSize || 0;
    
    // Check if we have all pieces
    if (items.length !== seriesSize) {
      res.json({
        success: true,
        data: {
          available: false,
          reason: 'incomplete_series',
          message: `Serie incompleta (${items.length}/${seriesSize} piezas)`,
          missingCount: seriesSize - items.length,
          currentItems: items.map(i => ({
            carId: i.carId,
            position: i.seriesPosition,
            quantity: i.quantity
          }))
        }
      });
      return;
    }

    // Check if all pieces have enough inventory
    const unavailableItems = items.filter(item => (item.quantity - (item.reservedQuantity ?? 0)) < 1);
    
    if (unavailableItems.length > 0) {
      res.json({
        success: true,
        data: {
          available: false,
          reason: 'insufficient_stock',
          message: `No hay suficiente inventario`,
          unavailableItems: unavailableItems.map(i => ({
            carId: i.carId,
            position: i.seriesPosition,
            available: i.quantity - (i.reservedQuantity ?? 0)
          }))
        }
      });
      return;
    }

    // Series is complete and available
    res.json({
      success: true,
      data: {
        available: true,
        seriesId,
        seriesName: items[0].seriesName,
        seriesSize,
        seriesPrice: items[0].seriesPrice,
        items: items.map(i => ({
          _id: i._id,
          carId: i.carId,
          position: i.seriesPosition,
          quantity: i.quantity,
          reservedQuantity: i.reservedQuantity ?? 0,
          available: i.quantity - (i.reservedQuantity ?? 0)
        }))
      }
    });
  } catch (error) {
    console.error('Error checking series availability:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al verificar disponibilidad de la serie' 
    });
  }
};

// Get missing pieces for a series (to complete it)
export const getMissingSeriesPieces = async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId } = req.params;

    const existingItems = await InventoryItemModel.find({ seriesId }).sort({ seriesPosition: 1 });

    if (!existingItems || existingItems.length === 0) {
      res.status(404).json({ 
        success: false, 
        message: `No se encontró la serie: ${seriesId}` 
      });
      return;
    }

    const seriesSize = existingItems[0].seriesSize || 0;
    const existingPositions = existingItems.map(i => i.seriesPosition);
    const missingPositions = [];

    for (let i = 1; i <= seriesSize; i++) {
      if (!existingPositions.includes(i)) {
        missingPositions.push(i);
      }
    }

    res.json({
      success: true,
      data: {
        seriesId,
        seriesName: existingItems[0].seriesName,
        seriesSize,
        existingCount: existingItems.length,
        missingCount: missingPositions.length,
        missingPositions,
        existingItems: existingItems.map(i => ({
          carId: i.carId,
          position: i.seriesPosition
        }))
      }
    });
  } catch (error) {
    console.error('Error getting missing pieces:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener piezas faltantes' 
    });
  }
};
