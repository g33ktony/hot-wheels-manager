import { Request, Response } from 'express';
import { InventoryItemModel } from '../models/InventoryItem';
import { HotWheelsCarModel } from '../models/HotWheelsCar';
import { IHotWheelsCar } from '../models/HotWheelsCar';
import { calculateDefaultSeriesPrice } from '../utils/seriesHelpers';
import { calculateSimilarity } from '../utils/searchUtils';

const inventoryQueryCache = new Map<string, { data: any; expiresAt: number }>();
const INVENTORY_CACHE_TTL_MS = 15 * 1000; // 15 seconds cache window

const buildInventoryCacheKey = (query: any, page: number, limit: number) => {
  return JSON.stringify({ query, page, limit });
};

const invalidateInventoryCache = () => inventoryQueryCache.clear();

// Get inventory items
export const getInventoryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    // Extract filter parameters
    const searchTerm = req.query.search as string;
    const filterCondition = req.query.condition as string;
    const filterBrand = req.query.brand as string;
    const filterPieceType = req.query.pieceType as string;
    const filterTreasureHunt = req.query.treasureHunt as string; // 'all' | 'th' | 'sth'
    const filterChase = req.query.chase === 'true';

    // Build query object (without search term for now - will do fuzzy search in memory)
    const query: any = {};

    // Condition filter
    if (filterCondition && filterCondition.length > 0) {
      query.condition = filterCondition;
    }

    // Brand filter
    if (filterBrand && filterBrand.length > 0) {
      query.brand = filterBrand;
    }

    // Piece type filter
    if (filterPieceType && filterPieceType.length > 0) {
      query.pieceType = filterPieceType;
    }

    // Treasure Hunt filter
    if (filterTreasureHunt && filterTreasureHunt !== 'all') {
      if (filterTreasureHunt === 'th') {
        query.isTreasureHunt = true;
      } else if (filterTreasureHunt === 'sth') {
        query.isSuperTreasureHunt = true;
      }
    }

    // Chase filter
    if (filterChase) {
      query.isChase = true;
    }

    // Get all items matching non-search filters
    let allItems = await InventoryItemModel.find(query)
      .select('-__v -updatedAt')
      .populate({
        path: 'carId',
        select: 'name year color series _id',
        options: { lean: true }
      })
      .lean()
      .sort({ dateAdded: -1 });

    // Apply fuzzy search if search term is provided
    if (searchTerm && searchTerm.length > 0) {
      const SIMILARITY_THRESHOLD = 75;
      const filtered = allItems.filter((item: any) => {
        // Check carId (if it's an object with name, use name; if it's a string, use directly)
        const carIdText = typeof item.carId === 'object' ? item.carId?.name || '' : item.carId || '';
        
        // Check for exact matches first
        if (carIdText.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
        if (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
        
        // Check for fuzzy matches
        const carIdSimilarity = calculateSimilarity(searchTerm, carIdText);
        const notesSimilarity = item.notes ? calculateSimilarity(searchTerm, item.notes) : 0;
        
        return carIdSimilarity >= SIMILARITY_THRESHOLD || notesSimilarity >= SIMILARITY_THRESHOLD;
      });
      allItems = filtered;
    }

    const total = allItems.length;
    
    if (total === 0) {
      // If no inventory matches, return empty result
      const emptyData = {
        items: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit
        }
      };
      res.json({
        success: true,
        data: emptyData,
        message: 'No items found matching filters'
      });
      return;
    }

    // Apply pagination after filtering and fuzzy search
    const inventoryItems = allItems.slice(skip, skip + limit);
    const responseData = {
      items: inventoryItems,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting inventory items:', error);
    res.status(500).json({ error: 'Error fetching inventory items' });
  }
};

// Add inventory item
export const addInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    invalidateInventoryCache()
    const { 
      carId, quantity, purchasePrice, suggestedPrice, condition, notes, photos, location,
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

    // Validate photos: reject base64 data (must be Cloudinary URLs)
    if (photos && Array.isArray(photos)) {
      for (const photo of photos) {
        if (typeof photo === 'string' && (photo.includes('base64') || photo.startsWith('data:'))) {
          res.status(400).json({
            success: false,
            error: 'Base64 images are no longer supported. Please use Cloudinary upload. Your photos should be URLs like https://res.cloudinary.com/...'
          });
          return;
        }
      }
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
      if (photos) {
        existingItem.photos = photos;
      }
      if (location) {
        existingItem.location = location;
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
        photos: photos || [],
        location: location || '',
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
    invalidateInventoryCache()
    const { id } = req.params;
    const updates = req.body;

    // Validate photos: reject base64 data (must be Cloudinary URLs)
    if (updates.photos && Array.isArray(updates.photos)) {
      for (const photo of updates.photos) {
        if (typeof photo === 'string' && (photo.includes('base64') || photo.startsWith('data:'))) {
          res.status(400).json({
            success: false,
            error: 'Base64 images are no longer supported. Please use Cloudinary upload. Your photos should be URLs like https://res.cloudinary.com/...'
          });
          return;
        }
      }
    }

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
    invalidateInventoryCache()
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
    
    // Build base filter without fuzzy search
    if (year) {
      searchFilter.year = year as string;
    }
    
    if (series) {
      searchFilter.series = { $regex: series, $options: 'i' };
    }

    // Get all cars matching year/series filters
    let cars = await HotWheelsCarModel.find(searchFilter)
      .sort({ year: -1, model: 1 })
      .lean();

    // Apply fuzzy search if query is provided
    if (query) {
      const SIMILARITY_THRESHOLD = 75;
      const queryStr = query as string;
      const filtered = cars.filter((car: any) => {
        // Check for exact matches in model, series, color, toy_num
        if (car.model?.toLowerCase().includes(queryStr.toLowerCase())) {
          return true;
        }
        if (car.series?.toLowerCase().includes(queryStr.toLowerCase())) {
          return true;
        }
        if (car.color?.toLowerCase().includes(queryStr.toLowerCase())) {
          return true;
        }
        if (car.toy_num?.toLowerCase().includes(queryStr.toLowerCase())) {
          return true;
        }

        // Check for fuzzy matches
        const modelSimilarity = calculateSimilarity(queryStr, car.model || '');
        const seriesSimilarity = calculateSimilarity(queryStr, car.series || '');
        const colorSimilarity = calculateSimilarity(queryStr, car.color || '');
        const toyNumSimilarity = calculateSimilarity(queryStr, car.toy_num || '');

        return (
          modelSimilarity >= SIMILARITY_THRESHOLD ||
          seriesSimilarity >= SIMILARITY_THRESHOLD ||
          colorSimilarity >= SIMILARITY_THRESHOLD ||
          toyNumSimilarity >= SIMILARITY_THRESHOLD
        );
      });
      cars = filtered;
    }

    const total = cars.length;
    const paginatedCars = cars.slice(skip, skip + parseInt(limit as string));

    res.json({
      success: true,
      data: {
        cars: paginatedCars,
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
